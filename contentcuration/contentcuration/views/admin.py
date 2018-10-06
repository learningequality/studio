import ast
import base64
import cStringIO as StringIO
import csv
import json
import locale
import os
import sys
import time
from itertools import chain

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.sites.shortcuts import get_current_site
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import SuspiciousOperation
from django.db.models import CharField
from django.db.models import F
from django.db.models import Q

from django.db.models import Count
# from django.db.models.aggregates import ArrayAgg
from django.db.models import Max
from django.db.models import Sum
from django.db.models import Value
from django.db.models.functions import Concat
from django.http import FileResponse
from django.http import HttpResponse
from django.http import HttpResponseBadRequest
from django.http import HttpResponseNotFound
from django.http import StreamingHttpResponse
from django.shortcuts import render
from django.template import Context
import django_filters
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from django.template.loader import get_template
from django.template.loader import render_to_string
from django.views.decorators.cache import cache_page
from django.views.decorators.http import condition
from le_utils.constants import content_kinds
from PIL import Image
from rest_framework.authentication import BasicAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from xhtml2pdf import pisa

from contentcuration.decorators import browser_is_supported
from contentcuration.decorators import is_admin
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import generate_file_on_disk_name
from contentcuration.models import Invitation
from contentcuration.models import User
from contentcuration.serializers import AdminChannelListSerializer
from contentcuration.serializers import AdminUserListSerializer
from contentcuration.serializers import CurrentUserSerializer
from contentcuration.serializers import UserChannelListSerializer
from contentcuration.utils.channelcache import ChannelCacher
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

    channel_list = ChannelCacher.get_all_channels()
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

    sizes = ContentNode.objects\
        .prefetch_related('assessment_items')\
        .prefetch_related('files')\
        .prefetch_related('children')\
        .filter(tree_id=channel.main_tree.tree_id)\
        .values('files__checksum', 'assessment_items__files__checksum', 'files__file_size', 'assessment_items__files__file_size')\
        .distinct()\
        .aggregate(resource_size=Sum('files__file_size'), assessment_size=Sum('assessment_items__files__file_size'))

    return HttpResponse(json.dumps({
        "counts": list(channel.main_tree.get_descendants().values('kind_id').annotate(count=Count('kind_id')).order_by('kind_id')),
        "size": (sizes['resource_size'] or 0) + (sizes['assessment_size'] or 0),
    }))


@login_required
@api_view(['GET'])
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def get_userlist(request):
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")

    user_list = User.objects.all()
    user_serializer = SimpleAdminUserListSerializer(user_list, many=True)

    return Response(user_serializer.data)


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


from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from rest_framework.filters import SearchFilter


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
        'users',
        'items',      # not working yet!
        'modified',       # not working yet!
        'created',
    )
    ordering = ('name',)

    def get_queryset(self):

        # (This part requires django 1.11)
        # descendants = ContentNode.objects\
        #             .filter(tree_id=OuterRef('main_tree__tree_id'))\
        #             .order_by()\
        #             .values('tree_id')
        # modified = descendants.aggregate(Max('modified'))

        queryset = Channel.objects\
            .annotate(created=F('main_tree__created'))\
            .annotate(items=F("main_tree__rght")/2 - 1)

        if self.request.GET.get('can_edit') == 'True':
            return queryset.filter(editors__contains=self.request.user)
        else:
            return queryset.all()


class AdminUserListFilter(django_filters.FilterSet):
    # is_chef = django_filters.BooleanFilter(
    #     name='main_tree__published',
    # )
    # can_edit_channel = django_filters.Filter(name="editable_channels", lookup_expr='in')
    chef_channels = django_filters.NumberFilter(name='chef_channels')
    chef_channels__gt = django_filters.NumberFilter(name='chef_channels', lookup_expr='gt')
    # is_chef = django_filters.BooleanFilter('is_chef')
    class Meta:
        model = User
        fields = (
            'email',
            'first_name',
            'last_name',
            'id',
            # 'is_chef',
            'is_admin',
            'is_active',
            'is_staff',
            'date_joined',
            'disk_space',
            # 'chef_channels'
            # 'can_edit_channel',
        )


from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from rest_framework.filters import SearchFilter


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
        'editable_channels__name'
    )

    ordering_fields = (
        'first_name',
        'last_name',
        'date_joined',
        'email',
        'editable_channels_count',
        'chef_channels'
    )
    ordering = ('email',)

    # filter_fields = (
    #     'chef_channels',
    #     'editable_channels_count'
    # )

    def get_queryset(self):
        queryset = User.objects\
            .annotate(editable_channels_count=Count('editable_channels'))\
            .annotate(chef_channels=Count('editable_channels__ricecooker_version'))\
            # .annotate(is_chef=Count('chef_channels', Q(chef_channels__gt=0)))

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


def sizeof_fmt(num, suffix='B'):
    """ Format sizes """
    for unit in ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z']:
        if abs(num) < 1024.0:
            return "%3.1f%s%s" % (num, unit, suffix)
        num /= 1024.0
    return "%.1f%s%s" % (num, 'Yi', suffix)


def pluralize_kind(kind, number):
    return "{} {}{}".format(number, kind.replace("html5", "HTML app").capitalize(), "s" if number != 1 else "")


def generate_thumbnail(channel):
    THUMBNAIL_DIMENSION = 200
    if channel.icon_encoding:
        return channel.icon_encoding
    elif channel.thumbnail_encoding:
        return ast.literal_eval(channel.thumbnail_encoding).get('base64')
    elif channel.thumbnail:
        try:
            checksum, ext = os.path.splitext(channel.thumbnail)
            filepath = generate_file_on_disk_name(checksum, channel.thumbnail)
            buffer = StringIO.StringIO()

            with Image.open(filepath) as image:
                width, height = image.size
                dimension = min([THUMBNAIL_DIMENSION, width, height])
                image.thumbnail((dimension, dimension), Image.ANTIALIAS)
                image.save(buffer, image.format)
                return "data:image/{};base64,{}".format(ext[1:], base64.b64encode(buffer.getvalue()))
        except IOError:
            pass


def get_channel_data(channel, site, default_thumbnail=None):
    import time
    start = time.time()
    print "Starting " + channel.name.encode('utf-8')

    data = {
        "name": channel.name,
        "id": channel.id,
        "public": "Yes" if channel.public else "No",
        "description": channel.description,
        "language": channel.language and channel.language.readable_name,
        "generated_thumbnail": default_thumbnail is not None and generate_thumbnail(channel) or default_thumbnail,
        "url": "http://{}/channels/{}/edit".format(site, channel.id)
    }

    descendants = channel.main_tree.get_descendants().prefetch_related('children', 'files', 'tags')\
        .select_related('license', 'language')
    resources = descendants.exclude(kind=content_kinds.TOPIC)

    # Get sample pathway by getting longest path
    max_level = resources.aggregate(max_level=Max('level'))['max_level']
    deepest_node = resources.filter(level=max_level).first()
    if deepest_node:
        pathway = deepest_node.get_ancestors(include_self=True)\
            .exclude(pk=channel.main_tree.pk)\
            .annotate(name=Concat('title', Value(' ('), 'kind_id', Value(')'), output_field=CharField()))\
            .values_list('name', flat=True)
        data["sample_pathway"] = " -> ".join(pathway)
    else:
        data["sample_pathway"] = "Channel is empty"

    # Get information related to channel
    tokens = channel.secret_tokens.values_list('token', flat=True)
    data["tokens"] = ", ".join(["{}-{}".format(t[:5], t[5:]) for t in tokens if t != channel.id])
    data["editors"] = ", ".join(list(channel.editors.annotate(name=Concat('first_name', Value(' '),
                                                                          'last_name', Value(' ('), 'email', Value(')'),
                                                                          output_field=CharField()))
                                     .values_list('name', flat=True)))

    data["tags"] = ", ".join(channel.tags.exclude(tag_name=None).values_list('tag_name', flat=True).distinct())

    # Get language information
    node_languages = descendants.exclude(language=None).values_list('language__readable_name', flat=True).distinct()
    file_languages = descendants.exclude(files__language=None).values_list('files__language__readable_name', flat=True)
    language_list = list(set(chain(node_languages, file_languages)))
    language_list = filter(lambda l: l is not None and l is not data['language'], language_list)
    language_list = map(lambda l: l.replace(",", " -"), language_list)
    language_list = sorted(map(lambda l: l.replace(",", " -"), language_list))
    data["languages"] = ", ".join(language_list)
    data["languages"] = ""

    # Get kind information
    kind_list = list(descendants.values('kind_id').annotate(count=Count('kind_id')).order_by('kind_id'))
    data["kind_counts"] = ", ".join([pluralize_kind(k['kind_id'], k['count']) for k in kind_list])

    # Get file size
    data["total_size"] = sizeof_fmt(resources.values('files__checksum', 'files__file_size').distinct(
    ).aggregate(resource_size=Sum('files__file_size'))['resource_size'] or 0)

    print channel.name.encode('utf-8') + " time:", time.time() - start
    return data


class Echo:
    """An object that implements just the write method of the file-like
    interface.
    """

    def write(self, value):
        """Write the value by returning it, instead of storing in a buffer."""
        return value


def get_default_thumbnail():
    filepath = os.path.join(settings.STATIC_ROOT, 'img', 'kolibri_placeholder.png')
    with open(filepath, 'rb') as image_file:
        _, ext = os.path.splitext(filepath)
        return "data:image/{};base64,{}".format(ext[1:], base64.b64encode(image_file.read()))


def stream_csv_response_generator(request):
    """ Get list of channels and extra metadata """
    channels = Channel.objects.prefetch_related('editors', 'secret_tokens', 'tags')\
        .select_related('main_tree')\
        .exclude(deleted=True)\
        .filter(public=True)\
        .distinct()\
        .order_by('name')
    site = get_current_site(request)

    pseudo_buffer = Echo()
    writer = csv.writer(pseudo_buffer)

    yield writer.writerow(['Channel', 'ID', 'Public', 'Description', 'Tokens', 'Kind Counts',
                           'Total Size', 'Language', 'Other Languages', 'Tags', 'Editors', 'Sample Pathway'])

    for c in channels:
        data = get_channel_data(c, site)
        yield writer.writerow([data['name'], data['id'], data['public'], data['description'], data['tokens'],
                               data['kind_counts'], data['total_size'], data['language'], data['languages'],
                               data['tags'], data['editors'], data['sample_pathway']])


@login_required
@condition(etag_func=None)
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def download_channel_csv(request):
    """ Writes list of channels to csv, which is then returned """
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")

    response = StreamingHttpResponse(stream_csv_response_generator(request), content_type="text/csv")
    response['Content-Disposition'] = 'attachment; filename="channels.csv"'

    return response


@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def download_channel_pdf(request):

    import time
    start = time.time()

    template = get_template('export/channels_pdf.html')

    channels = Channel.objects.prefetch_related('editors', 'secret_tokens', 'tags')\
        .select_related('main_tree')\
        .filter(public=True, deleted=False)\
        .distinct()\
        .order_by('name')

    print "Channel query time:", time.time() - start

    site = get_current_site(request)

    default_thumbnail = get_default_thumbnail()

    channel_list = [get_channel_data(c, site, default_thumbnail) for c in channels]

    context = Context({
        "channels": channel_list
    })

    html = template.render(context)

    result = StringIO.StringIO()
    pdf = pisa.pisaDocument(StringIO.StringIO(html.encode("UTF-8")), result, encoding='UTF-8', path=settings.STATIC_ROOT)
    if not pdf.err:
        response = FileResponse(result.getvalue())
        response['Content-Type'] = 'application/pdf'
        response['Content-disposition'] = 'attachment;filename=channels.pdf'
        response['Set-Cookie'] = "fileDownload=true; path=/"

    print "\n\n\nTotal time:", time.time() - start, "\n\n\n"
    return response
