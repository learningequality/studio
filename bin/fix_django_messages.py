import os

script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, '..'))


def fix_django1_11_en_po():
    """
    When Django 1.11 creates a new English .po file as a result of a call to makemessages, it generates it with
    placeholder values for the plural forms definition. This replaces that text with the correct plural forms values,
    based on the fix used for Django 2.0.

    See here for more info: https://code.djangoproject.com/ticket/28709

    :return:
    """
    en_file = os.path.join(root_dir, 'contentcuration', 'locale', 'en', 'LC_MESSAGES', 'django.po')
    f = open(en_file)
    data = f.read()
    f.close()

    data = data.replace(' nplurals=INTEGER; plural=EXPRESSION;', ' nplurals=2; plural=(n != 1);')

    f = open(en_file, 'w')
    f.write(data)
    f.close()

if __name__ == '__main__':
    fix_django1_11_en_po()
