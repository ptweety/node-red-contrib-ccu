# Contribution guide

✨ Thanks for contributing! ✨

Please take a moment to review this document in order to make the contribution process easy and effective for everyone involved.

- If you want to contribute to this repository, please first discuss any improvements or feature request via issue.
- If you need support, then head over to the [HomeMatic-Forum](https://homematic-forum.de/forum/viewforum.php?f=77) (mostly german speakers).

## Improve documentation and even issues

- Any user is also a perfect candidate to help others by improving the documentation. Typo corrections, error fixes, better explanations, more examples, etc. Open issues for things that could be improved.
- Some issues are created with missing information, not reproducible, or plain invalid. Help make them easier to resolve.

## Submit a new issue

- Search the issue tracker before opening an issue.
- Ensure you're using the latest version.
- Use a clear and descriptive title.
- Include as much information as possible: Steps to reproduce the issue, error message, Node.js and Node-RED version, operating system, etc.
- The more time you put into an issue, the more others will too.

# Development guide

## Prepare a new PR

Adhering to the following this process is the best way to get your work merged:

- Fork the repo, clone your fork, and configure the remotes:

    ```bash
    $ git clone https://github.com/<your-username>/<repo-name>
    $ cd <repo-name>
    $ git remote add upstream https://github.com/<upsteam-owner>/<repo-name>
    ```

- If you cloned a while ago, get the latest changes from upstream:

    ```bash
    $ git checkout <dev-branch>
    $ git pull upstream <dev-branch>
    ```

- Create a new topic branch (off the main project development branch) to contain your feature, change, or fix:

    ```bash
    $ git checkout -b <topic-branch-name>
    ```

- Also install all the required `node_modules`:

    ```bash
    $ npm install
    ```

- Develop and Commit your changes in logical chunks.
- Don't include unrelated changes.
- New features should be accompanied with tests and documentation.
- Lint and Test your changes

    ```bash
    $ npm run lintonly
    $ npm run testonly
    $ npm test
    ```

- Use a clear and descriptive title for your commits.
- Give your commits a `<type>`, e.g.:
  - **feat:** for a new feature for the user, not a new feature for build script. Such commit will trigger a release bumping a MINOR version.
  - **fix:** for a bug fix for the user, not a fix to a build script. Such commit will trigger a release bumping a PATCH version.
  - **perf:** for performance improvements. Such commit will trigger a release bumping a PATCH version.
  - **docs:** for changes to the documentation.
  - **style:** for formatting changes, missing semicolons, etc.
  - **refactor:** for refactoring production code, e.g. renaming a variable.
  - **test:** for adding missing tests, refactoring tests; no production code change.
  - **build:** for updating build configuration, development tools or other changes irrelevant to the user.

- Locally merge (or rebase) the upstream development branch into your topic branch:

    ```bash
    $ git pull [--rebase] upstream <dev-branch>
    ```

- Use Git's interactive rebase feature to tidy up your commits before making them public.
- Push your topic branch to your fork:

    ```bash
    $ git push origin <topic-branch-name>
    ```

- Open a Pull Request with a clear title and description.

## How to develop

The recommended way to develop is using a local [Visual Studio Code](https://code.visualstudio.com/) dev environment.

- _Create_ a `.node-red` runtime folder (e.g. in the parent folder: `../.node-red`):
- _Create_ a `settings.json` in your runtime folder:

    ```javascript
    process.env.SOME_ENV = true;

    module.exports = {
        flowFile: '../.node-red/flows.json',
        userDir: '../.node-red/',
        credentialSecret: 'dummy',
        functionGlobalContext: {
            // os:require('os'),
            env: process.env,
        },
        logging: {
            console: {
                /** Level of logging to be recorded. Options are:
                 * fatal - only those errors which make the application unusable should be recorded
                 * error - record errors which are deemed fatal for a particular request + fatal errors
                 * warn - record problems which are non fatal + errors + fatal errors
                 * info - record information about the general running of the application + warn + error + fatal errors
                 * debug - record information which is more verbose than info + info + warn + error + fatal errors
                 * trace - record very detailed logging + debug + info + warn + error + fatal errors
                 * off - turn off all logging (doesn't affect metrics or audit)
                 */
                level: "debug",
                /** Whether or not to include metric events in the log output */
                metrics: false,
                /** Whether or not to include audit events in the log output */
                audit: false
            }
        },
    };
    ```

- _Initialize_ this runtime folder and _Link_ this repository to make it available to Node-RED:

    ```bash
    $ npm init -y
    $ npm install <path-to>/<repo-name>
    ```

## Components

- Node-RED:
  <https://nodered.org>

- XO:
  <https://github.com/xojs/xo>

- Mocha:
  <https://mochajs.org>

- Husky:
  <https://typicode.github.io/husky/#/>

- auto-changelog:
  <https://github.com/cookpete/auto-changelog>

- npm-check-updates:
  <https://github.com/raineorshine/npm-check-updates>

## GitHub Workflows

- **QA**: on each push or pull request or manual - runs all tests

## Maintainers - publish new versions

- https://docs.npmjs.com/creating-and-publishing-scoped-public-packages
  - _Login_ &nbsp; `$ npm login`
  - _Bump_ &nbsp; `$ npm version <major|minor|patch> -m "chore: bump version to %s"`
  - _Publish_ &nbsp; `$ npm publish --access public`

## Links

- https://semver.org/
- https://www.conventionalcommits.org/en/v1.0.0/
- https://blog.npmjs.org/post/184553141742/easy-automatic-npm-publishes
- https://keepachangelog.com/en/1.0.0/
