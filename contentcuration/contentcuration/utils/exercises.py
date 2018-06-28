import json
import re
from django.template.loader import render_to_string
from le_utils.constants import exercises
from contentcuration.utils.parser import extract_value

# TODO mod
PERSEUS_IMG_DIR = ''


def process_formulas(content):
    for match in re.finditer(ur'\$(\$.+\$)\$', content):
        content = content.replace(match.group(0), match.group(1))
    return content


def generate_assessment_item(assessment_item):
    if assessment_item.type == exercises.MULTIPLE_SELECTION:
        template = 'perseus/multiple_selection.json'
    elif assessment_item.type == exercises.SINGLE_SELECTION or assessment_item.type == 'true_false':
        template = 'perseus/multiple_selection.json'
    elif assessment_item.type == exercises.INPUT_QUESTION:
        template = 'perseus/input_question.json'
    elif assessment_item.type == exercises.PERSEUS_QUESTION:
        template = 'perseus/perseus_question.json'
    else:
        raise TypeError("Unrecognized question type on item {}".format(assessment_item.assessment_id))

    question = process_formulas(assessment_item.question)
    question, question_images = process_image_strings(question)

    answer_data = json.loads(assessment_item.answers)
    for answer in answer_data:
        if assessment_item.type == exercises.INPUT_QUESTION:
            answer['answer'] = extract_value(answer['answer'])
        else:
            answer['answer'] = answer['answer'].replace(exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR)
            answer['answer'] = process_formulas(answer['answer'])
            # In case perseus doesn't support =wxh syntax, use below code
            answer['answer'], answer_images = process_image_strings(answer['answer'])
            answer.update({'images': answer_images})

    answer_data = list(filter(lambda a: a['answer'] or a['answer'] == 0, answer_data))  # Filter out empty answers, but not 0

    hint_data = json.loads(assessment_item.hints)
    for hint in hint_data:
        hint['hint'] = process_formulas(hint['hint'])
        hint['hint'], hint_images = process_image_strings(hint['hint'])
        hint.update({'images': hint_images})

    context = {
        'question': question,
        'question_images': question_images,
        'answers': sorted(answer_data, lambda x, y: cmp(x.get('order'), y.get('order'))),
        'multiple_select': assessment_item.type == exercises.MULTIPLE_SELECTION,
        'raw_data': assessment_item.raw_data.replace(exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR),
        'hints': sorted(hint_data, lambda x, y: cmp(x.get('order'), y.get('order'))),
        'randomize': assessment_item.randomize,
    }

    return render_to_string(template, context).encode('utf-8', "ignore")


def process_image_strings(content):
    ''' TODO '''
    image_list = []
    content = content.replace(exercises.CONTENT_STORAGE_PLACEHOLDER, PERSEUS_IMG_DIR)
    for match in re.finditer(ur'!\[(?:[^\]]*)]\(([^\)]+)\)', content):
        img_match = re.search(ur'(.+/images/[^\s]+)(?:\s=([0-9\.]+)x([0-9\.]+))*', match.group(1))
        if img_match:
            # Add resizing data
            if img_match.group(2) and img_match.group(3):
                image_data = {'name': img_match.group(1)}
                image_data.update({'width': float(img_match.group(2))})
                image_data.update({'height': float(img_match.group(3))})
                image_list.append(image_data)
            content = content.replace(match.group(1), img_match.group(1))

    return content, image_list
