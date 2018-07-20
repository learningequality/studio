import json
import re
from django.template.loader import render_to_string
from le_utils.constants import exercises
from contentcuration.utils.parser import extract_value
from contentcuration.models import generate_storage_url


def generate_assessment_item(assessment_item):
    question, question_images = process_question(assessment_item)
    context = {
        'question': question,
        'question_images': question_images,
        'answers': process_answers(assessment_item),
        'hints': process_hints(assessment_item),
        'raw_data': process_raw_data(assessment_item),
        'multiple_select': assessment_item.type == exercises.MULTIPLE_SELECTION,
        'randomize': assessment_item.randomize,
    }

    return render_to_string(
        get_assessment_template(assessment_item),
        context
    ).encode('utf-8', "ignore")


def get_assessment_template(assessment_item):
    if assessment_item.type == exercises.MULTIPLE_SELECTION:
        return 'perseus/multiple_selection.json'
    elif assessment_item.type == exercises.SINGLE_SELECTION or assessment_item.type == 'true_false':
        return 'perseus/multiple_selection.json'
    elif assessment_item.type == exercises.INPUT_QUESTION:
        return 'perseus/input_question.json'
    elif assessment_item.type == exercises.PERSEUS_QUESTION:
        return 'perseus/perseus_question.json'

    raise TypeError("Unrecognized question type on item {}".format(assessment_item.assessment_id))


def process_question(assessment_item):
    question = process_formulas(assessment_item.question)
    return process_image_strings(question)


def process_answers(assessment_item):
    answer_data = json.loads(assessment_item.answers)
    for answer in answer_data:
        if assessment_item.type == exercises.INPUT_QUESTION:
            answer['answer'] = extract_value(answer['answer'])
        else:
            answer['answer'] = process_formulas(answer['answer'])
            answer['answer'], answer_images = process_image_strings(answer['answer'])
            # In case perseus doesn't support =wxh syntax, use below code
            answer.update({'images': answer_images})

    # Filter out empty answers, but not 0
    answer_data = list(filter(lambda a: a['answer'] or a['answer'] == 0, answer_data))

    # Sort answers by their order property
    return sorted(answer_data, lambda x, y: cmp(x.get('order'), y.get('order')))


def process_hints(assessment_item):
    hint_data = json.loads(assessment_item.hints)
    for hint in hint_data:
        hint['hint'] = process_formulas(hint['hint'])
        hint['hint'], hint_images = process_image_strings(hint['hint'])
        hint.update({'images': hint_images})

    return sorted(hint_data, lambda x, y: cmp(x.get('order'), y.get('order')))


def process_raw_data(assessment_item):
    # no apparent use for the image dictionary generated
    replaced_raw_data, image_dict = process_image_strings(assessment_item.raw_data)
    return replaced_raw_data


def process_formulas(content):
    # strips second "$" from formula declarations
    for match in re.finditer(ur'\$(\$.+\$)\$', content):
        content = content.replace(match.group(0), match.group(1))
    return content


def process_image_strings(content):
    image_list = []
    # find markdown image specs
    for match in re.finditer(ur'!\[(?:[^\]]*)]\(([^\)]+)\)', content):
        imagePattern = ur'(.+' + exercises.CONTENT_STORAGE_PLACEHOLDER + '/([^\s]+))(?:\s=([0-9\.]+)x([0-9\.]+))*'
        img_match = re.search(imagePattern, match.group(1))

        filepath = generate_storage_url(img_match.group(2))

        if img_match:
            # Add resizing data
            if img_match.group(2) and img_match.group(3):
                image_data = {'name': filepath}
                image_data.update({'width': float(img_match.group(2))})
                image_data.update({'height': float(img_match.group(3))})
                image_list.append(image_data)
            content = content.replace(match.group(1), filepath)

    return content, image_list
