"""Custom template tags that create HTML fragments."""

from django import template
from django.contrib.messages import get_messages as django_get_messages
from django.template.defaulttags import CsrfTokenNode
from django.templatetags.static import static as get_static_path
from django.utils.html import format_html, format_html_join, mark_safe

register = template.Library()


@register.simple_tag
def add_style(*paths):
    """
    Add a stylesheet link to the <head> from the given path.

    from:
    {% add_style 'base/page_modify.css' %}

    to:
    <link
        rel="stylesheet"
        type="text/css"
        href="{% static 'css/base/page_modify.css' %}"
        crossorigin="anonymous"
    >
    """
    attrs = [
        (
            'stylesheet',
            'text/css',
            get_static_path(path),
            'anonymous',
        )
        for path in paths
    ]
    return format_html_join(
        '',
        '<link rel="{}" type="{}" href="{}" crossorigin="{}">',
        attrs,
    )


@register.simple_tag
def add_script(*paths):
    """
    Add a script to the <head> from the given path.

    from:
    {% add_script 'base/page_modify.js' %}

    to:
    <script src="{% static 'js/base/page_modify.js' %}"></script>
    """
    return format_html_join(
        '',
        '<script src="{}"></script>',
        [(get_static_path(path),) for path in paths],
    )


@register.simple_tag(takes_context=True)
def get_feedback(context, *forms):
    """
    Generate a list of messages from forms and the messages framework.

    from:
    {% get_feedback form1 form2 %}

    to:
    <ul class="messages">
        # for every message
            <li class="{{ message.level_tag }}">{{ message }}</li>
        # for every error in non_field_errors and field.errors
            <li class="error">{{ error }}</li>
    </ul>
    """
    messages = [
        (message.level_tag, message)
        for message in django_get_messages(context['request'])
    ]

    for form in forms:
        messages += [
            ('error', error)
            for errors in form.errors.values()
            for error in errors
        ]

    if len(messages) == 0:
        return ''  # return nothing if no messages
    else:
        message_list = format_html_join(
            '',
            '<li class="{}">{}</li>',
            messages,
        )
        return format_html(
            '<ul class="messages">{}</ul>',
            mark_safe(message_list),
        )


@register.simple_tag
def create_field(*fields):
    """
    Generate a form field using the provided fields.

    from:
    {% create_field field1 field2 %}

    to:
    <div class="field {{ field1.html_name }}">
        {{ field1.label_tag }}
        {{ field1 }}
    </div>
    <div class="field {{ field2.html_name }}">
        {{ field2.label_tag }}
        {{ field2 }}
    </div>
    """
    try:
        info = [
            (field.html_name, field.label_tag(), field)
            for field in fields
        ]
    except AttributeError:
        raise Exception('One of these fields does not exist')

    return format_html_join(
        '',
        '<div class="field {}">{}{}</div>',
        info,
    )


@register.simple_tag
def create_all_fields(form):
    """Call create_field for every field in this form."""
    return create_field(*[field for field in form])


@register.tag
def create_form(parser, token):
    """
    Create a form with the given contents at the end of the form.

    from:
    {% create_form form form_class %}
        <button>Submit</button>
    {% end_create_form %}

    to:
    <form method="post" class="form_class">
        {% csrf_token %}
        {% create_all_fields form %}
        <button>Submit</button>
    </form>
    """
    contents = token.split_contents()
    if len(contents) == 1:
        raise template.TemplateSyntaxError(
            f'{repr(contents[0])} tag requires a form',
        )

    form = contents[1]
    form_classes = contents[2:]

    nodelist = parser.parse(('end_create_form',))
    parser.delete_first_token()
    return CreateFormNode(form, form_classes, nodelist)


class CreateFormNode(template.Node):
    """A template node for the create_form template tag."""

    def __init__(self, form, form_classes, nodelist):
        """Initialize a CreateFormNode."""
        self.form = template.Variable(form)
        self.form_classes = form_classes
        self.nodelist = nodelist

    def render(self, context):
        """Render the create_form tag."""
        form_class = ' '.join(self.form_classes)
        csrf_token = CsrfTokenNode().render(context)
        fields = create_all_fields(self.form.resolve(context))
        rest = self.nodelist.render(context)
        return format_html(
            '<form method="{}" enctype="{}" class="{}">{}{}{}</form>',
            'post',
            'multipart/form-data',
            form_class,
            csrf_token,
            mark_safe(fields),
            mark_safe(rest),
        )
