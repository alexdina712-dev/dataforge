def pytest_make_parametrize_id(config, val, argname):
    # Never embed a full uploaded-file fixture in test IDs or filesystem names.
    if isinstance(val, bytes):
        return f"bytes-{len(val)}"
    return None
