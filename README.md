# CalChart

An attempt at a web-based redesign of Calchart, which integrates the desktop Calchart application, the viewer, and the server.

Goals:
- Create a cloud file system that stores shows created by Stunt and can be viewed by bandsmen
- Create an intuitive UI for charting shows
- Integrate Calchart Viewer
- Integrate the individual continuity generator

## Setup

1. Install Virtualbox and Vagrant
2. Clone the repo
3. `vagrant up`: This will setup a VM that will be installed with all dependencies needed for this project
4. Create a `.env` file in the top-level directory
5. Set up webpack (see the "Webpack" section)

## Development

First, get the Django server running:

1. `vagrant ssh`
2. `python manage.py runserver`.

You should now be able to connect to `http://localhost:5000` (but it won't be pretty).

### Webpack

Using `webpack-dev-server` in a virtual machine is difficult to use because changing a file on your local machine triggers different filesystem events on your local machine and in the synced folder in the VM. Because of this, there are three ways to work on Calchart:

1. Run webpack on your local machine (Recomennded)
    * Pro: Recompiling takes ~100 ms
    * Con: Need to install Node on your computer
    * Steps (on your own computer):
        1. Install [Node](https://nodejs.org/en/download/) on your computer (MacOS: `brew install node@6`)
        2. `npm install` (only needs to run the first time)
        3. `npm run dev`
        4. Edit files locally
2. Edit files on the virtual machine
    * Pro: Recompiling takes ~100 ms
    * Pro: No additional installation necessary
    * Con: Need to edit files on the virtual machine
    * Pro: You get really good at `vim`?
    * Steps:
        1. `vagrant ssh`
        2. Add `export WEBPACK_PORT=4100` to `.env`
        3. `npm install --no-bin-links` (only needs to run the first time)
        4. `npm run dev`
        5. Edit files on the VM using `vim` or another text editor
3. Use the `--watch-poll` option. (Not recommended)
    * Pro: No additional installation necessary
    * Con: Recompiling takes ~5000 ms
    * Steps:
        1. `vagrant ssh`
        2. Add `export WEBPACK_PORT=4100` to `.env`
        3. `npm install --no-bin-links` (only needs to run the first time)
        4. `npm run dev -- --port 4100 --watch-poll`
        5. Edit files locally

After all the appropriate steps are run, `http://localhost:5000` should now be styled.

## Testing

This project contains three testing facilities:

1. Linting (`npm run lint` and `flake8 calchart/`): Checks code style
2. Server-side tests (`python manage.py test`): These are Django tests that test functionality within the back-end; e.g. testing Django models
3. Unit tests (`npm test`): These are Javascript tests (using the Mocha library) that test functionality within the front-end; e.g. testing Component methods

More detailed information and examples of these tests can be found in `docs/Testing.md`.
