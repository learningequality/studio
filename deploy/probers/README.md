# Writing your own prober

Thanks for helping make Studio a more stable application!

Probers are small programs that check that certain functionality in live
production is working. Probers shouldn't be complex and require more than a
hundred lines of code. That might be a sign that your prober can be broken down
into multiple smaller probers, or that it should be an integration test instead.

Probers not only check if the main application is working, it also pings backend
services such as the database and makes sure they're running. This helps warn
the team if something isn't right. Or if something goes horribly wrong, the team can
easily pinpoint what services aren't running properly.

## How do I get started?

First, get up to speed with the [cloudprober](https://cloudprober.org/) program.
This is the program that runs all probers. It has some builtin probers like
simple HTTP, UDP and DNS probers. These can all be written using cloudprober's
declarative [config
file](https://cloudprober.org/getting-started/#configuration). You can find
Studio's `cloudprober.cfg` file in
[here](https://github.com/learningequality/studio/blob/develop/deploy/secretmanage).

If your prober is a simple HTTP request that doesn't require any login, that's
great! All of your changes should be in the `cloudprober.cfg` file.

If your prober is more complex, you should write a script that the cloudprober
program will call.

## Writing a python-based prober

So you've determined that your prober can't be a simple HTTP, DNS or UDP ping,
or it requires multiple steps. The next thing you need to do is to write a
script that the cloudprober program can call.

The Learning Equality team has the most experience writing in Python. Our
infrastructure and dependencies also assumes a Python program. For this reason,
most prober scripts should also be in Python.

To see the full structure of a python-based prober, skim through the [channel
creation
probe](https://github.com/learningequality/studio/blob/develop/deploy/probers/channel_creation_probe.py).

The things you should do:
1. Create an empty Python script inside the [probers directory](https://github.com/learningequality/studio/tree/develop/deploy/probers).
2. Within the `base` module is a `BaseProbe` class. Create a new `Probe` class that inherits from `BaseProbe`.
3. Define a new name for your metric, as shown in [here](https://github.com/learningequality/studio/blob/develop/deploy/probers/channel_creation_probe.py#L9).
4. If your prober creates new data every time it runs, make sure to add a
   `develop_only` flag. This prevents your prober from running in the real
   system, but can still be tested up until the staging server.
5. Override the `do_probe` method. This is the meat of your prober -- the
   `BaseProbe` will track how long this method runs to completion.
6. At the bottom of your script, make sure to call your prober's `run` method,
   as shown
   [here](https://github.com/learningequality/studio/blob/develop/deploy/probers/channel_creation_probe.py#L28-L29).
7. Make your prober executable by running `chmod +x <new prober path>`.
8. Run your prober by itself. If it succeeds, it should print out the metric
name you defined, and how long it took to run, in milliseconds.
9. Add an entry in `cloudprober.cfg`. You can see how other custom probers are
   integrated by looking at an example
   [here](https://github.com/learningequality/studio/blob/develop/deploy/cloudprober.cfg),
   and reviewing the [official documentation](https://cloudprober.org/how-to/external-probe/).
10. Run the cloudprober program with the new config by running `/path/to/cloudprober --config_file <studio repo root>/deploy/cloudprober.cfg`
11. Your new prober should run after the cloudprober program starts, plus the
    interval you set. If you want to test your prober out rapidly, you may want
    to set your interval to 5000 ms before increasing it to the interval you want in production.
12. Create a pull request against [Studio's develop branch](https://github.com/learningequality/studio) when you're done!
   
