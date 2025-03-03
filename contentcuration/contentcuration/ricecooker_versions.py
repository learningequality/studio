"""
Latest ricecooker version
Any version >= VERSION_OK will get a message that
the version is "up to date" (log level = info)
"""
VERSION_OK = "0.6.32"  # this gets overwritten to current v. after XML RPC call
VERSION_OK_MESSAGE = "Ricecooker v{} is up-to-date."

"""
Recommended minimum ricecooker version
Any version < VERSION_OK and >= VERSION_SOFT_WARNING will get a
recommendation to upgrade before running (log level = warning)
"""
VERSION_SOFT_WARNING = "0.6.30"
VERSION_SOFT_WARNING_MESSAGE = (
    "You are using Ricecooker v{}, however v{} is available. "
    "You should consider upgrading your Ricecooker."
)

"""
Minimum working ricecooker version
Any version < VERSION_SOFT_WARNING and >= VERSION_HARD_WARNING
will get a strong recommendation to upgrade (log level = error)
"""
VERSION_HARD_WARNING = "0.6.21"
VERSION_HARD_WARNING_MESSAGE = (
    "Ricecooker v{} is deprecated. Any channels created with this version "
    "will be unlinked with any future upgrades. You are strongly recommended to upgrade to v{}."
)

"""
Any version < VERSION_HARD_WARNING will not run
and will get an error message to upgrade to the latest version
"""
VERSION_ERROR = None
VERSION_ERROR_MESSAGE = (
    "Ricecooker v{} is no longer compatible. You must upgrade to v{} to continue."
)
