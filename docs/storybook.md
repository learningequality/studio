# Storybook

Storybook is a development environment for UI components. If this is your first encounter with this tool, you can check [this presentation](https://docs.google.com/presentation/d/10JL4C9buygWsTbT62Ym149Yh9zSR9nY_ZqFumBKUY0o/edit?usp=sharing) or [its website](https://storybook.js.org/). You are encouraged to use it any time you need to develop a new UI component. It is especially suitable for smaller to middle size components that represent basic UI building blocks.

An example is worth a thousand words so please have a look at these simple [stories of an example component](./contentcuration/contentcuration/frontend/shared/views/details/DetailsRow.stories.js) to see how to write yours. For detailed information on writing stories you can [go through this tutorial](https://www.learnstorybook.com/intro-to-storybook/).

You can also check [official addons](https://storybook.js.org/addons/).

**Run development server**

```bash
pnpm run storybook
```

With detailed webpack information (useful when debugging loaders, addons and similar):

```bash
pnpm run storybook:debug
```

**Bundle**

```bash
pnpm run storybook:build
```

The output is saved to *storybook-static/*.

## Current usage notes

We've decided not to push our stories to the codebase and keep them locally in the near future. Although this limits the number of advantages Storybook provides, it allows us to start using it as soon as possible without the need to agree on all conventions and it also gives the whole team enough time to test the development workflow so we can decide later if we want to adopt this tool in a larger scale.

Taking into account the above-mentioned, all stories except of example *DetailsRow.stories.js* will be ignored by git as long as you use a naming convention for Storybook source files: *\*.stories.js*.

Although we don't share stories at this point, Storybook is installed and configured in the codebase to prevent the need for everyone to configure everything locally. If you update Storybook Webpack settings, install a new plugin and similar, you are welcome to share such updates with other members of the team.
