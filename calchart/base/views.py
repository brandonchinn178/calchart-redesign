"""Views for the base app."""

import json

from base import actions
from base.forms import CreateUserForm
from base.mixins import LoginRequiredMixin
from base.models import Show, User

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.views import LoginView as DjangoLoginView
from django.core.exceptions import PermissionDenied
from django.http.response import HttpResponse, JsonResponse, Http404
from django.middleware.csrf import get_token
from django.shortcuts import redirect
from django.utils import timezone
from django.views.generic import CreateView, RedirectView, TemplateView

from utils.api import get_login_url

""" ENDPOINTS """


def export(request, slug):
    """Return a JSON file to be downloaded automatically."""
    show = Show.objects.get(slug=slug)
    response = HttpResponse(show.data_file.read())
    response['Content-Disposition'] = f'attachment; filename={slug}.json'

    return response


""" AUTH PAGES """


class LoginView(DjangoLoginView):
    """
    The login page for a user.

    The page allows a user to login with their Calchart credentials, or click
    a link to login with their Members Only account.
    """

    template_name = 'login.html'
    redirect_authenticated_user = True


class AuthMembersOnlyView(RedirectView):
    """
    Redirects the user to Members Only for authentication.

    The Members Only API will redirect back to Calchart after the user logs in.
    """

    def dispatch(self, request, *args, **kwargs):
        """Login the given user, or redirect to the Members Only API."""
        if 'username' in request.GET:
            self.login_user()
            return redirect(request.GET['next'])
        else:
            return super().dispatch(request, *args, **kwargs)

    def get_redirect_url(self, *args, **kwargs):
        """Get the redirect URL for the Members Only API."""
        redirect_url = self.request.GET['next']
        return get_login_url(self.request, redirect_url)

    def login_user(self):
        """Login the user after authenticating from Members Only."""
        username = self.request.GET['username']
        api_token = self.request.GET['api_token']
        ttl_days = int(self.request.GET['ttl_days'])

        user = User.objects.filter(members_only_username=username).first()
        if user is None:
            user = User.objects.create_members_only_user(
                username=username,
                api_token=api_token,
                ttl_days=ttl_days,
            )
        else:
            user.api_token = api_token
            user.set_expiry(ttl_days)
            user.save()

        login(self.request, user)


class CreateUserView(CreateView):
    """Create a new Calchart user."""

    template_name = 'create_user.html'
    form_class = CreateUserForm

    def form_valid(self, form):
        """Save the form and redirect to the login page."""
        form.save()
        messages.success(self.request, 'User successfully created.')
        return redirect('login')


""" CALCHART PAGE """


class CalchartView(LoginRequiredMixin, TemplateView):
    """
    The single page application for all Calchart pages.

    Each page renders the same HTML file, but Vue will route to the
    appropriate page. See router.js.
    """

    template_name = 'calchart.html'

    def get(self, request, *args, **kwargs):
        """Handle a GET request, either for the page or for tab data."""
        if 'tab' in request.GET:
            shows = self.get_tab(request.GET['tab'])
            return JsonResponse({
                'shows': [
                    {
                        'slug': show.slug,
                        'name': show.name,
                        'published': show.published,
                    }
                    for show in shows
                ],
            })
        else:
            return super().get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        """Handle POST actions from sendAction."""
        try:
            action = request.POST['action']
        except KeyError:
            return super().post(request, *args, **kwargs)

        if hasattr(actions, action):
            try:
                data = json.loads(request.POST['data'])
                response = getattr(actions, action)(
                    data=data,
                    user=request.user,
                    request=request,
                )
            except Exception as e:
                status = 404 if isinstance(e, Http404) else 500
                return JsonResponse({
                    'message': str(e),
                }, status=status)
        else:
            return JsonResponse({
                'message': f'Action does not exist: {action}',
            }, status=500)

        if response is None:
            return JsonResponse({})
        else:
            return JsonResponse(response)

    def get_context_data(self, **kwargs):
        """Get the context data for the template."""
        context = super().get_context_data(**kwargs)

        context['env'] = {
            'csrf_token': get_token(self.request),
            'static_path': settings.STATIC_URL[:-1],
            'is_stunt': self.request.user.has_committee('STUNT'),
            'is_local': settings.IS_LOCAL,
        }

        context['tabs'] = self.get_tabs()

        return context

    def get_tabs(self):
        """
        Get all available tabs for the current user.

        Available tabs are:
        - band: Shows created by STUNT for this year
        - created: Shows created by the current user

        Returns tabs in a tuple of the form (id, display_name).
        """
        if self.request.user.is_members_only_user():
            year = timezone.now().year
            return [
                ('band', f'{year} Shows'),
                ('owned', 'My Shows'),
            ]
        else:
            return [
                ('owned', 'My Shows'),
            ]

# class EditorView(CalchartMixin, TemplateView):
#     """
#     The editor view that can edit shows
#     """
#     template_name = 'editor2.html'

#     def post_auth(self, request, *args, **kwargs):
#         self.show = get_object_or_404(Show, slug=kwargs['slug'])

#         if (self.show.is_band and
#                 not self.request.user.has_committee('STUNT')):
#             raise PermissionDenied

#     def get_context_data(self, **kwargs):
#         context = super().get_context_data(**kwargs)
#         context['show'] = self.show
#         return context

#     def save_show(self):
#         """
#         A POST action that saves a show's JSON data.
#         """
#         self.show.save_data(self.request.POST['data'])

#     def upload_audio(self):
#         """
#         A POST action that uploads an audio file for the show.
#         """
#         audio = self.request.FILES['audio']
#         ext = os.path.splitext(audio.name)[1]
#         filename = f'audio/{self.show.slug}{ext}'
#         if default_storage.exists(filename):
#             default_storage.delete(filename)
#         filename = default_storage.save(filename, audio)

#         return JsonResponse({
#             'url': settings.MEDIA_URL + filename,
#         })

#     def upload_sheet_image(self):
#         """
#         A POST action that uploads an image for a given sheet in the show.
#         """
#         sheet = self.request.POST['sheet']
#         image = self.request.FILES['image']
#         filename = f'backgrounds/{self.show.slug}/{image.name}'
#         if default_storage.exists(filename):
#             default_storage.delete(filename)
#         filename = default_storage.save(filename, image)

#         return JsonResponse({
#             'url': settings.MEDIA_URL + filename,
#         })

# class ViewerView(CalchartMixin, TemplateView):
#     """
#     The view that can view shows
#     """
#     template_name = 'viewer.html'

#     def dispatch(self, request, *args, **kwargs):
#         self.show = get_object_or_404(Show, slug=kwargs['slug'])
#         return super().dispatch(request, *args, **kwargs)

#     def get_context_data(self, **kwargs):
#         context = super().get_context_data(**kwargs)
#         context['show'] = self.show
#         return context

# class ViewpsheetView(CalchartMixin, TemplateView):
#     """
#     The view that generates viewpsheets for a show. Can also pass in
#     a dot ID in the GET parameters to initialize the dot to generate
#     viewpsheets for.
#     """
#     template_name = 'viewpsheet.html'

#     def dispatch(self, request, *args, **kwargs):
#         self.show = get_object_or_404(Show, slug=kwargs['slug'])
#         return super().dispatch(request, *args, **kwargs)

#     def get_context_data(self, **kwargs):
#         context = super().get_context_data(**kwargs)
#         context['show'] = self.show
#         context['dot'] = self.request.GET.get('dot')
#         return context

#     def save_settings(self):
#         """
#         A POST action that saves a user's viewpsheet settings.
#         """
#         settings = {
#             key: self.request.POST[key]
#             for key in [
#               'pathOrientation',
#               'nearbyOrientation',
#               'birdsEyeOrientation',
#               'layoutLeftRight']
#         }
#         settings['layoutLeftRight'] = settings['layoutLeftRight'] == 'true'
#         self.request.user.viewpsheet_settings = json.dumps(settings)
#         self.request.user.save()
