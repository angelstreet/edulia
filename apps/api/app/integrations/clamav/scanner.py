"""ClamAV virus scanning integration.

Uses clamd library when available. Falls back to no-op when ClamAV is not installed.
"""

import logging

logger = logging.getLogger(__name__)


def scan_file(content: bytes) -> tuple[bool, str | None]:
    """Scan file content for viruses.

    Returns (is_clean, threat_name). is_clean=True if no threats found.
    """
    try:
        import clamd

        cd = clamd.ClamdUnixSocket()
        result = cd.instream(content)
        status, reason = result.get("stream", ("ERROR", "Unknown"))
        if status == "OK":
            return True, None
        return False, reason
    except ImportError:
        logger.debug("clamd not installed, skipping virus scan")
        return True, None
    except Exception as e:
        logger.warning(f"ClamAV scan failed: {e}, allowing file")
        return True, None
