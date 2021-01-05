{% load js_reverse %}

{% js_reverse_inline %}

{% autoescape off %}
{{ webpack_service_worker }}
{% endautoescape %}
