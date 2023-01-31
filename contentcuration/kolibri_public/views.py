# from django.shortcuts import render
# from rest_framework import viewsets
# from rest_framework.response import Response


class CacheControlMixin:
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response['Cache-Control'] = 'public'
        return response

# def get_last_modified(self, request, *args, **kwargs):
    #     return None

# class KolibriPublicViewSet(CacheControlMixin, viewsets.ModelViewSet):

#     ...
