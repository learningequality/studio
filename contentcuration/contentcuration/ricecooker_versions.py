import xmlrpclib
from socket import gaierror

VERSION_OK = "0.5.10"

try:
	pypi = xmlrpclib.ServerProxy('https://pypi.python.org/pypi')
	VERSION_OK = pypi.package_releases('ricecooker')[0]
except gaierror:
	pass

VERSION_OK_MESSAGE = "Ricecooker v{} is up-to-date."
VERSION_SOFT_WARNING = "0.5.6"
VERSION_SOFT_WARNING_MESSAGE = "You are using Ricecooker v{}, however v{} is available. You should consider upgrading your Ricecooker."
VERSION_HARD_WARNING = "0.3.13"
VERSION_HARD_WARNING_MESSAGE = "Ricecooker v{} is deprecated. Any channels created with this version will be unlinked with any future upgrades. You are strongly recommended to upgrade to v{}."
VERSION_ERROR = None
VERSION_ERROR_MESSAGE = "Ricecooker v{} is no longer compatible. You must upgrade to v{} to continue."