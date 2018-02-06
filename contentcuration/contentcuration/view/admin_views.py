import csv
import json
import logging
import os
import time
import locale
import pdfkit

from django.conf import settings
from django.http import HttpResponse, HttpResponseNotFound
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist, SuspiciousOperation
from django.db.models import Q, Case, When, Value, IntegerField, Count, Sum, CharField
from django.db.models.functions import Concat
from django.core.urlresolvers import reverse_lazy
from django.template.loader import render_to_string, get_template
from django.template import Context
from itertools import chain
from rest_framework.renderers import JSONRenderer
from contentcuration.api import check_supported_browsers
from contentcuration.models import Channel, User, Invitation, ContentNode
from contentcuration.utils.messages import get_messages
from contentcuration.serializers import AdminChannelListSerializer, AdminUserListSerializer, CurrentUserSerializer
from reportlab.pdfgen import canvas
from rest_framework.authentication import SessionAuthentication, BasicAuthentication, TokenAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import api_view, authentication_classes, permission_classes

from xhtml2pdf import pisa
import cStringIO as StringIO

locale.setlocale(locale.LC_TIME, '')

EMAIL_PLACEHOLDERS = [
    { "name": "First Name", "value": "{first_name}" },
    { "name": "Last Name", "value": "{last_name}" },
    { "name": "Email", "value": "{email}" },
    { "name": "Current Date", "value": "{current_date}" },
    { "name": "Current Time", "value": "{current_time}" },
]

def send_custom_email(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            subject = render_to_string('registration/custom_email_subject.txt', {'subject': data["subject"]})
            recipients = User.objects.filter(email__in=data["emails"]).distinct()

            for recipient in recipients:
                text = data["message"].format(current_date=time.strftime("%A, %B %d"), current_time=time.strftime("%H:%M %Z"),**recipient.__dict__)
                message = render_to_string('registration/custom_email.txt', {'message': text})
                recipient.email_user(subject, message, settings.DEFAULT_FROM_EMAIL, )

        except KeyError:
            raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

        return HttpResponse(json.dumps({"success": True}))

@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def administration(request):
    # Check if browser is supported
    if not check_supported_browsers(request.META['HTTP_USER_AGENT']):
        return redirect(reverse_lazy('unsupported_browser'))

    if not request.user.is_admin:
        return redirect(reverse_lazy('unauthorized'))

    return render(request, 'administration.html', {
                                                 "current_user": JSONRenderer().render(CurrentUserSerializer(request.user).data),
                                                 "default_sender": settings.DEFAULT_FROM_EMAIL,
                                                 "placeholders": json.dumps(EMAIL_PLACEHOLDERS, ensure_ascii=False),
                                                 "messages": get_messages(),
                                                })

@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def get_all_channels(request):
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")

    channel_list = Channel.objects.select_related('main_tree').prefetch_related('editors', 'viewers').distinct()
    channel_serializer = AdminChannelListSerializer(channel_list, many=True)

    return HttpResponse(JSONRenderer().render(channel_serializer.data))

@login_required
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
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def get_all_users(request):
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")

    user_list = User.objects.prefetch_related('editable_channels').prefetch_related('view_only_channels').distinct()
    user_serializer = AdminUserListSerializer(user_list, many=True)

    return HttpResponse(JSONRenderer().render(user_serializer.data))


@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def make_editor(request):
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")

    if request.method == 'POST':
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

    if request.method == 'POST':
        data = json.loads(request.body)

        try:
            user = User.objects.get(pk=data["user_id"])
            channel = Channel.objects.get(pk=data["channel_id"])
            channel.editors.remove(user)
            channel.save()

            return HttpResponse(json.dumps({"success": True}))
        except ObjectDoesNotExist:
            return HttpResponseNotFound('Channel with id {} not found'.format(data["channel_id"]))

def sizeof_fmt(num, suffix='B'):
    for unit in ['','Ki','Mi','Gi','Ti','Pi','Ei','Zi']:
        if abs(num) < 1024.0:
            return "%3.1f%s%s" % (num, unit, suffix)
        num /= 1024.0
    return "%.1f%s%s" % (num, 'Yi', suffix)

def get_sample_pathway(node):
    first_node = node.children.filter(kind_id="topic").first() or node.children.first()
    if not first_node:
        return []
    return ["{} ({})".format(first_node.title, first_node.kind_id)] + get_sample_pathway(first_node)

def generate_channel_list(user):
    channel_list = []
    channels = Channel.objects.prefetch_related('editors', 'secret_tokens')\
                              .select_related('main_tree')\
                              .filter(Q(public=True) | Q(editors=user) | Q(viewers=user))\
                              .order_by("name")
    for c in channels:
        print(c.id)


        channel = {
            "name": c.name,
            "id": c.id,
            "public": "Yes" if c.public else "No",
            "description": c.description,
            "language": c.language.readable_name,
        }

        # Get information related to channel
        channel["tokens"] = ", ".join(list(c.secret_tokens.values_list('token', flat=True)))
        channel["editors"] = ", ".join(list(c.editors.annotate(name=Concat('first_name', Value(' '), \
                                                    'last_name', Value(' ('), 'email', Value(')'),\
                                                    output_field=CharField()))\
                                          .values_list('name', flat=True)))

        # Get information related to nodes
        nodes = c.main_tree.get_descendants().prefetch_related('files', 'tags', 'children', 'language')
        channel["sample_pathway"] = " -> ".join(get_sample_pathway(c.main_tree))
        channel["tags"] = ", ".join([t for t in nodes.values_list('tags__tag_name', flat=True).distinct() if t != None])

        # Get language information
        node_languages = nodes.exclude(language=None).values_list('language__readable_name', flat=True)
        file_languages = nodes.values_list('files__language__readable_name', flat=True)
        language_list = filter(lambda l: l != None and l != channel['language'], set(chain(node_languages, file_languages)))
        channel["languages"] = ", ".join(language_list)

        # Get file information
        kind_list = nodes.values('kind_id')\
                         .annotate(count=Count('kind_id'))\
                         .order_by('kind_id')
        channel["kind_counts"] = ", ".join(["{}s: {}".format(k['kind_id'].capitalize(), k['count']) for k in kind_list])
        channel["total_size"] = sizeof_fmt(nodes.values('files__checksum', 'files__file_size')\
                          .distinct()\
                          .aggregate(size=Sum('files__file_size'))['size'] or 0)

        channel_list.append(channel)

    return channel_list


@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def download_channel_csv(request):
    if not request.user.is_admin:
        raise SuspiciousOperation("You are not authorized to access this endpoint")

    # Create the HttpResponse object with the appropriate CSV header.
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="channels.csv"'

    writer = csv.writer(response)
    writer.writerow(['Channel', 'ID', 'Public', 'Description', 'Tokens', 'Kind Counts',\
                    'Total Size', 'Language', 'Other Languages', 'Tags', 'Editors', 'Sample Pathway'])

    channels = generate_channel_list(request.user)

    # Write channels to csv file
    for c in channels:
        writer.writerow([c['name'], c['id'], c['public'], c['description'], c['tokens'], c['kind_counts'], \
                         c['total_size'], c['language'], c['languages'], c['tags'], c['editors'], c['sample_pathway']])

    return response


from easy_pdf.views import PDFTemplateView

class ChannelPDFView(PDFTemplateView):
    template_name = "export/channels_pdf.html"

    def get_context_data(self, **kwargs):
        context = super(ChannelPDFView, self).get_context_data(**kwargs)
        context['pagesize'] = 'A4'
        context['channels'] = generate_channel_list(self.request.user)
        return context

def link_callback(uri, rel):
    # use short variable names
    sUrl = settings.STATIC_URL      # Typically /static/
    sRoot = settings.STATIC_ROOT    # Typically /home/userX/project_static/
    mUrl = settings.MEDIA_URL       # Typically /static/media/
    mRoot = settings.MEDIA_ROOT     # Typically /home/userX/project_static/media/

    # convert URIs to absolute system paths
    if uri.startswith(mUrl):
        path = os.path.join(mRoot, uri.replace(mUrl, ""))
    elif uri.startswith(sUrl):
        path = os.path.join(sRoot, uri.replace(sUrl, ""))

    # make sure that file exists
    if not os.path.isfile(path):
        raise Exception(
                'media URI must start with %s or %s' % \
                (sUrl, mUrl))
    return path

@login_required
@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAdminUser,))
def download_channel_pdf(request):
    # Prepare context
    data = {
        'pagesize':'A4',
        "channels": generate_channel_list(request.user)
    }

    # Render html content through html template with context
    template = get_template('export/channels_pdf.html')
    html  = template.render(Context(data))

    # Write PDF to file
    file = open(os.path.join(settings.MEDIA_ROOT, 'report.pdf'), "w+b")
    pisaStatus = pisa.CreatePDF(html, dest=file, link_callback = link_callback)

    # Return PDF document through a Django HTTP response
    file.seek(0)
    pdf = file.read()
    file.close()            # Don't forget to close the file handle
    return HttpResponse(pdf, mimetype='application/pdf')

    # context = {
    #     'pagesize':'A4',
    #     "channels": generate_channel_list(request.user)
    # }
    # links = lambda uri, rel: os.path.join(settings.MEDIA_ROOT, uri.replace(settings.MEDIA_URL, ''))
    # html = render_to_string('export/channels_pdf.html', dict, context_instance=RequestContext(request))
    # result = StringIO()
    # pdf = pisa.pisaDocument(StringIO(html.encode("UTF-8")), dest=result, link_callback=links)
    # if not pdf.err:
    #     return HttpResponse(result.getvalue(), mimetype='application/pdf')
    # return HttpResponse('Pisa hates you! %s' % cgi.escape(html))


    # template = get_template('export/channels_pdf.html')
    # context = Context({
    #     'pagesize':'A4',
    #     "channels": generate_channel_list(request.user)
    # })
    # html  = template.render(context)
    # result = StringIO.StringIO()
    # # links = lambda uri, rel: os.path.join(settings.MEDIA_ROOT, uri.replace(settings.MEDIA_URL, ''))

    # pdf = pisa.pisaDocument(StringIO.StringIO(html.encode("ISO-8859-1")), result, link_callback=fetch_resources)
    # if not pdf.err:
    #     return HttpResponse(result.getvalue(), content_type='application/pdf')
    # return HttpResponse('Error loading pdf')

    # if not request.user.is_admin:
    #     raise SuspiciousOperation("You are not authorized to access this endpoint")

    # programconfig = ProgramConfig.get_solo()
    # programconfig.downloaded += 1
    # programconfig.save()

    # config = pdfkit.configuration(wkhtmltopdf=settings.PDF_WKHTMLTOPDF)

    # content = render_to_string(
    #     'program/item2pdf.html', {
    #         'events': Event.objects.all(),
    #         'abs_path': settings.PDF_ADDRESS,
    #         'programconfig': programconfig
    #     }
    # )

    # pdf = pdfkit.PDFKit(content, "string", configuration=config).to_pdf()

    # response = HttpResponse(pdf)
    # response['Content-Type'] = 'application/pdf'
    # response['Content-disposition'] = 'attachment;filename='
    # response['Content-disposition'] += programconfig.get_filename

    # return response

    # options = {
    #     'page-size': 'A4',
    #     'margin-top': '0.75in',
    #     'margin-right': '0.75in',
    #     'margin-bottom': '0.75in',
    #     'margin-left': '0.75in',
    # }

    # template = get_template('export/channels_pdf.html')
    # context = Context({
    #     'pagesize':'A4',
    #     "channels": generate_channel_list(request.user)
    # })
    # html  = template.render(context)
    # result = BytesIO()
    # pdf = pisa.pisaDocument(BytesIO(html.encode("ISO-8859-1")), result)
    # if not pdf.err:
    #      return HttpResponse(result.getvalue(), content_type='application/pdf')
    # return HttpResponse('We had some errors<pre>%s</pre>' % escape(html))


def download_test(request):
    return render(request, 'export/channels_pdf.html', {
        "channels": generate_channel_list(request.user)
    })