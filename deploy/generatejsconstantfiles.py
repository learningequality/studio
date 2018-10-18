import json
import os
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants import languages
from le_utils.constants import licenses
from le_utils.constants import exercises
from le_utils.constants import roles


def get_preset_dict(constant):
    return {
        "id": constant.id,
        "readable_name": constant.readable_name,
        "multi_language": constant.multi_language,
        "supplementary": constant.supplementary,
        "thumbnail": constant.thumbnail,
        "subtitle": constant.subtitle,
        "display": constant.display,
        "order": constant.order,
        "kind_id": constant.kind,
        "allowed_formats": constant.allowed_formats,
        "associated_mimetypes": list(set(map(lambda x: next(file for file in file_formats.FORMATLIST if file.id == x).mimetype, constant.allowed_formats)))
    }


def get_language_dict(constant):
    return {
        "id": constant.code,
        "lang_code": constant.primary_code,
        "lang_subcode": constant.subcode,
        "readable_name": constant.name,
        "native_name": constant.native_name,
        "lang_direction": languages.getlang_direction(constant.primary_code),
    }


def get_kind_dict(constant):
    return {
        "kind": constant.name,
    }


def get_license_dict(constant):
    return {
        "id": constant.id,
        "license_name": constant.name,
        "exists": constant.exists,
        "license_url": constant.url,
        "license_description": constant.description,
        "copyright_holder_required": constant.copyright_holder_required,
        "is_custom": constant.custom,
    }


constants_path = os.path.join(os.path.dirname(__file__), '../contentcuration/contentcuration/static/js/edit_channel/constants')


def generate_constants_file(constant_list, constant_name, mapper=None):
    output = ""
    output += "module.exports = ".format(constant_name=constant_name) + "[\n"
    for constant in constant_list:
        output += "  "
        if mapper is not None:
            output += "{\n"
            for attr, value in mapper(constant).items():
                cast_value = json.dumps(value)
                output += "    {key}: {value},\n".format(key=attr, value=cast_value)
            output += "  }"
        else:
            output += json.dumps(constant)
        output += ",\n"

    output += "];\n\n"

    with open(os.path.join(constants_path, constant_name + '.js'), 'w') as f:
        f.write(output)
    print("{0}: {1} constants saved".format(str(constant_name), len(constant_list)))


def main():
    print("***** Generating Constants in JS *****")
    try:
        os.mkdir(constants_path)
    except OSError:
        pass
    generate_constants_file(content_kinds.KINDLIST, 'ContentKinds', mapper=get_kind_dict)
    generate_constants_file(licenses.LICENSELIST, 'Licenses', mapper=get_license_dict)
    generate_constants_file(languages.LANGUAGELIST, 'Languages', mapper=get_language_dict)
    generate_constants_file(format_presets.PRESETLIST, 'FormatPresets', mapper=get_preset_dict)

    generate_constants_file([m[0] for m in exercises.MASTERY_MODELS if m[0] != exercises.SKILL_CHECK], 'MasteryModels')
    generate_constants_file([r[0] for r in roles.choices], 'Roles')

    print("************ DONE. ************")


if __name__ == "__main__":
    main()
