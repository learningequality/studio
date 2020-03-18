import json
import locale
import sys
import time

import django_filters
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.sites.shortcuts import get_current_site
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import SuspiciousOperation
from django.db.models import Case
from django.db.models import Count
from django.db.models import F
from django.db.models import IntegerField
from django.db.models import Sum
from django.db.models import When
from django.http import HttpResponse
from django.http import HttpResponseBadRequest
from django.http import HttpResponseNotFound
from django.shortcuts import render
from django.template.loader import render_to_string
from django.views.decorators.cache import cache_page
from django.views.decorators.http import condition
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.authentication import BasicAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.filters import OrderingFilter
from rest_framework.filters import SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from contentcuration.decorators import browser_is_supported
from contentcuration.decorators import is_admin
from contentcuration.models import Channel
from contentcuration.models import Invitation
from contentcuration.models import User
from contentcuration.serializers import AdminChannelListSerializer
from contentcuration.serializers import AdminUserListSerializer
from contentcuration.serializers import CurrentUserSerializer
from contentcuration.serializers import UserChannelListSerializer
from contentcuration.tasks import exportpublicchannelsinfo_task
from contentcuration.utils.messages import get_messages

reload(sys)
sys.setdefaultencoding('UTF8')
locale.setlocale(locale.LC_TIME, '')

DEFAULT_ADMIN_PAGE_SIZE = 2
EMAIL_PLACEHOLDERS = [
    {"name": "First Name", "value": "{first_name}"},
    {"name": "Last Name", "value": "{last_name}"},
    {"name": "Email", "value": "{email}"},
    {"name": "Current Date", "value": "{current_date}"},
    {"name": "Current Time", "value": "{current_time}"},
]


def send_custom_email(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    data = json.loads(request.body)
    try:
        subject = render_to_string('registration/custom_email_subject.txt', {'subject': data["subject"]})
        recipients = User.objects.filter(email__in=data["emails"]).distinct()

        for recipient in recipients:
            text = data["message"].format(current_date=time.strftime("%A, %B %d"), current_time=time.strftime("%H:%M %Z"), **recipient.__dict__)
            message = render_to_string('registration/custom_email.txt', {'message': text})
            recipient.email_user(subject, message, settings.DEFAULT_FROM_EMAIL, )

    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

    return HttpResponse(json.dumps({"success": True}))


@login_required
@browser_is_supported
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@is_admin
def administration(request):
    return render(request, 'administration.html', {
        "current_user": JSONRenderer().render(CurrentUserSerializer(request.user).data),
        "default_sender": settings.DEFAULT_FROM_EMAIL,
        "placeholders": json.dumps(EMAIL_PLACEHOLDERS, ensure_ascii=False),
        "messages": get_messages(),
    })


@cache_page(60 * 10)  # 10 minutes
@login_required
@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def get_all_channels(request):
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")

    channel_list = Channel.get_all_channels()
    channel_serializer = AdminChannelListSerializer(channel_list, many=True)

    return Response(channel_serializer.data)


@login_required
@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def get_channel_kind_count(request, channel_id):
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")

    channel = Channel.objects.get(pk=channel_id)
    data = channel.main_tree.get_details()

    return HttpResponse(json.dumps({
        "counts": data['kind_count'],
        "size": data['resource_size'],
    }))


class ChannelUserListPagination(PageNumberPagination):
    page_size = DEFAULT_ADMIN_PAGE_SIZE
    page_size_query_param = 'page_size'
    max_page_size = 500

    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'results': data
        })


class AdminChannelListFilter(django_filters.FilterSet):
    published = django_filters.BooleanFilter(
        name='main_tree__published',
    )
    staged = django_filters.BooleanFilter(
        name='staging_tree'
    )
    ricecooker_version__isnull = django_filters.rest_framework.BooleanFilter(
        name='ricecooker_version',
        lookup_expr='isnull'
    )

    class Meta:
        model = Channel
        fields = (
            'name',
            'id',
            'editors__id',
            'deleted',
            'public',
            'staging_tree',
            'staged',
            'ricecooker_version',
            'deleted',
            'published'
        )


class AdminChannelListView(generics.ListAPIView):
    serializer_class = AdminChannelListSerializer
    filter_backends = (DjangoFilterBackend, OrderingFilter, SearchFilter)
    filter_class = AdminChannelListFilter
    pagination_class = ChannelUserListPagination
    authentication_classes = (SessionAuthentication, BasicAuthentication, TokenAuthentication,)
    permission_classes = (IsAdminUser,)

    search_fields = (
        'name',
        '=id',
        'editors__first_name',
        'editors__last_name',
        '=editors__email',
    )

    ordering_fields = (
        'name',
        'id',
        'priority',
        'editors_count',
        'viewers_count',
        'resource_count',
        'modified',
        'created',
    )
    ordering = ('name',)

    def get_queryset(self):

        # (This part requires django 1.11, and isn't quite working!)
        # from django.db.models import OuterRef
        # from django.db.models.functions import Cast
        # from django.db.models.functions import Coalesce
        # from django.db.models import Subquery
        # from django.db.models import Int

        # modified = ContentNode.objects\
        #             .filter(tree_id=OuterRef('main_tree__tree_id'))\
        #             .order_by()\
        #             .values('tree_id')\
        #             .annotate(m=Max('modified'))\
        #             .values('m')

        queryset = Channel.objects

        if self.request.GET.get('deleted') == 'True' or self.request.GET.get('all') == 'True':
            pass
        else:
            queryset = queryset.exclude(deleted=True)

        queryset = queryset.select_related('main_tree').prefetch_related('editors', 'viewers')\
            .annotate(editors_count=Count('editors'))\
            .annotate(viewers_count=Count('viewers'))\
            .annotate(resource_count=F("main_tree__rght")/2 - 1)\
            .annotate(created=F('main_tree__created'))

        if self.request.GET.get('can_edit') == 'True':
            queryset = queryset.filter(editors__contains=self.request.user)
        else:
            pass

        return queryset.all()


class AdminUserListFilter(django_filters.FilterSet):
    chef_channels_count = django_filters.NumberFilter(name='chef_channels_count')
    chef_channels_count__gt = django_filters.NumberFilter(name='chef_channels_count', lookup_expr='gt')

    class Meta:
        model = User
        fields = (
            'email',
            'first_name',
            'last_name',
            'id',
            'is_admin',
            'is_active',
            'is_staff',
            'date_joined',
            'disk_space',
        )


class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserListSerializer
    filter_backends = (DjangoFilterBackend, OrderingFilter, SearchFilter)
    filter_class = AdminUserListFilter
    pagination_class = ChannelUserListPagination
    authentication_classes = (SessionAuthentication, BasicAuthentication, TokenAuthentication,)
    permission_classes = (IsAdminUser,)

    search_fields = (
        'first_name',
        'last_name',
        'email',
        '=editable_channels__id',
        'editable_channels__name',
    )

    ordering_fields = (
        'first_name',
        'last_name',
        'date_joined',
        'email',
        'editable_channels_count',
        'chef_channels_count'
    )
    ordering = ('email',)

    # filter_fields = (
    #     'chef_channels',
    #     'editable_channels_count'
    # )

    # count_chef_channels = Channel.objects.filter(editor=OuterRef('pk'))\
    #                                 .filter(ricecooker_version__isnull=False)\
    #                                 .order_by().values('ricecooker_version__isnull')\
    #                                 .annotate(c=Count('*')).values('c')

    def get_queryset(self):
        queryset = User.objects.prefetch_related('editable_channels')\
            .annotate(editable_channels_count=Count('editable_channels'))\
            .annotate(chef_channels_count=Sum(
                Case(
                    When(editable_channels__ricecooker_version__isnull=True, then=0),
                    When(editable_channels__ricecooker_version=None, then=0),
                    When(editable_channels__ricecooker_version='', then=0),
                    default=1, output_field=IntegerField()
                )
            ))

        return queryset.all()


@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def make_editor(request):
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")

    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    data = json.loads(request.body)

    try:
        user = User.objects.get(pk=data["user_id"])
        channel = Channel.objects.get(pk=data["channel_id"])

        channel.viewers.remove(user)                                        # Remove view-only access
        channel.editors.add(user)                                           # Add user as an editor
        channel.save()

        Invitation.objects.filter(invited=user, channel=channel).delete()   # Delete any invitations for this user

        return HttpResponse(json.dumps({"success": True}))
    except ObjectDoesNotExist:
        return HttpResponseNotFound('Channel with id {} not found'.format(data["channel_id"]))


@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def remove_editor(request):
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")

    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    data = json.loads(request.body)

    try:
        user = User.objects.get(pk=data["user_id"])
        channel = Channel.objects.get(pk=data["channel_id"])
        channel.editors.remove(user)
        channel.save()

        return HttpResponse(json.dumps({"success": True}))
    except ObjectDoesNotExist:
        return HttpResponseNotFound('Channel with id {} not found'.format(data["channel_id"]))


@login_required
@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def get_editors(request, channel_id):
    channel = Channel.objects.get(pk=channel_id)
    user_list = list(channel.editors.all().order_by("first_name"))
    user_serializer = UserChannelListSerializer(user_list, many=True)

    return Response(user_serializer.data)


@login_required
@condition(etag_func=None)
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def download_channel_csv(request):
    """ Writes list of channels to csv, which is then returned """
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")
    site = get_current_site(request)
    exportpublicchannelsinfo_task.delay(request.user.id, site_id=site.id, export_type="csv")
    return HttpResponse({"success": True})


@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def download_channel_pdf(request):
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")

    site = get_current_site(request)
    exportpublicchannelsinfo_task.delay(request.user.id, site_id=site.id)
    return HttpResponse({"success": True})
