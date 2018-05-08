def trace(f):
    try:
        import newrelic.agent
        return newrelic.agent.function_trace()(f)
    except ImportError:
        return f
