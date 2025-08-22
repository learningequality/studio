import json
import os

from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from le_utils.constants import languages
from le_utils.constants import licenses
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
        "associated_mimetypes": list(
            set(
                map(
                    lambda x: next(
                        file for file in file_formats.FORMATLIST if file.id == x
                    ).mimetype,
                    constant.allowed_formats,
                )
            )
        ),
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


def get_kind_value(constant):
    return constant.name


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


constants_path = os.path.join(
    os.path.dirname(__file__),
    "../contentcuration/contentcuration/frontend/shared/leUtils",
)


def generate_constants_map_file(
    constant_list, constant_name, mapper=None, sort_by="id"
):
    output = "// Constant values for {} sorted by {}\n".format(
        constant_name, "value" if mapper is None else sort_by
    )
    output += "const {}".format(constant_name) + "Map = new Map([\n"
    # Collect output for constant names too
    names_output = "export const {}Names =".format(constant_name)
    names_output += " {\n"
    # Don't generate this unless ids are strings
    generate_names_constants = True
    for constant in sorted(
        constant_list, key=lambda x: x if mapper is None else getattr(x, sort_by)
    ):
        output += "  "
        if mapper is not None:
            output += "[{}, ".format(json.dumps(constant.id)) + "{\n"
            for attr, value in mapper(constant).items():
                cast_value = json.dumps(value)
                output += "    {key}: {value},\n".format(key=attr, value=cast_value)
            output += "  }]"
        else:
            output += json.dumps(constant)
        output += ",\n"

        generate_names_constants = generate_names_constants and type(constant.id) is str
        if generate_names_constants:
            # Replace "-" with "_" to ensure we get keys that don't need to be wrapped in strings
            names_output += "  {}: '{}',\n".format(
                constant.id.upper().replace("-", "_"), constant.id
            )

    output += "]);\n\n"
    output += "export default {}Map\n\n".format(constant_name)
    output += "export const {}List = Array.from({}Map.values());\n".format(
        constant_name, constant_name
    )
    if generate_names_constants:
        output += "\n"
        output += names_output
        output += "};\n"

    with open(os.path.join(constants_path, constant_name + ".js"), "w") as f:
        f.write(output)
    print(  # noqa: T201
        "{0}: {1} constants saved".format(str(constant_name), len(constant_list))
    )


def generate_constants_set_file(
    constant_list, constant_name, mapper=None, sort_by="id"
):
    output = "// Constant values for {} sorted by {}\n".format(
        constant_name, "value" if mapper is None else sort_by
    )
    output += "const {} = new Set([\n".format(constant_name)
    # Collect output for constant names too
    names_output = "export const {}Names =".format(constant_name)
    names_output += " {\n"
    # Don't generate this unless ids are strings
    generate_names_constants = True
    for constant in sorted(
        constant_list, key=lambda x: 0 if mapper is None else getattr(x, sort_by)
    ):
        output += "  "
        value = mapper(constant) if mapper is not None else constant
        cast_value = json.dumps(value)
        output += "{},\n".format(cast_value)

        generate_names_constants = generate_names_constants and type(value) is str
        if generate_names_constants:
            # Replace "-" with "_" to ensure we get keys that don't need to be wrapped in strings
            names_output += "  {}: {},\n".format(
                value.upper().replace("-", "_"), cast_value
            )

    output += "]);\n\nexport default {};\n\n".format(constant_name)
    output += "export const {}List = Array.from({});\n".format(
        constant_name, constant_name
    )

    if generate_names_constants:
        output += "\n"
        output += names_output
        output += "};\n"

    with open(os.path.join(constants_path, constant_name + ".js"), "w") as f:
        f.write(output)
    print(  # noqa: T201
        "{0}: {1} constants saved".format(str(constant_name), len(constant_list))
    )


def main():
    print("***** Generating Constants in JS *****")  # noqa: T201
    try:
        os.mkdir(constants_path)
    except OSError:
        pass
    generate_constants_set_file(
        content_kinds.KINDLIST,
        "ContentKinds",
        mapper=get_kind_value,
    )
    generate_constants_map_file(
        licenses.LICENSELIST, "Licenses", mapper=get_license_dict
    )
    generate_constants_map_file(
        languages.LANGUAGELIST,
        "Languages",
        mapper=get_language_dict,
        sort_by="native_name",
    )
    generate_constants_map_file(
        format_presets.PRESETLIST, "FormatPresets", mapper=get_preset_dict
    )

    generate_constants_set_file(
        [
            m[0]
            for m in sorted(
                exercises.MASTERY_MODELS,
                key=lambda x: int(x[0][21:]) if "num_correct_in_a_row_" in x[0] else 0,
            )
            if m[0] != exercises.SKILL_CHECK and m[0] != exercises.QUIZ
        ],
        "MasteryModels",
    )
    generate_constants_set_file([r[0] for r in roles.choices], "Roles")

    print("************ DONE. ************")  # noqa: T201


if __name__ == "__main__":
    main()
