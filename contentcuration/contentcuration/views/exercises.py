from contentcuration.models import AssessmentItem
from contentcuration.utils.exercises import generate_assessment_item
from django.http import HttpResponse


def get_assessment_item_json(request, item_id):
    assessment_item_json_string = generate_assessment_item(AssessmentItem.objects.get(pk=item_id))
    return HttpResponse(assessment_item_json_string)
