# Migrate from node-red-contrib-ccu v3.4.2

The migration from [node-red-contrib-ccu](https://github.com/rdmtc/node-red-contrib-ccu) **v3.4.2** to the current version of [@ptweety/node-red-contrib-ccu](https://github.com/ptweety/node-red-contrib-ccu) is not a one click task. Since both packages provide the same nodes to the user, they cannot both exist in the same Node-RED installation.

So, you have to take care of the following:

- Backup your existing installation (at least the nodes from either variant of **node-red-contrib-ccu**)
- Remove the current version of **node-red-contrib-ccu**
- Install the wanted version of **@ptweety/node-red-contrib-ccu**
- Restore your nodes

Depending on your environment within which you run Node-RED the migration path is different:

## Manual approach

Outside of Node-RED:

- Backup your installation

Within Node-Red:

1. _Select_ all the nodes from `node-red-contrib-ccu` (their names all start with `ccu-*`)
1. _Backup_ them via `Menu` -> `Export` -> `Download` or `Copy to clipboard`.
1. _Delete_ these nodes from your flows.
1. _Check_ for any configuration nodes (`ccu-connection`) and remove them as well.
1. _Deploy_ your changes.
1. _Uninstall_ **node-red-contrib-ccu** via `Menu` -> `Manage palette` -> `remove`.
1. _Install_ **@ptweety/node-red-contrib-ccu** via `Menu` -> `Manage palette` -> `Install` -> `Search modules`.
1. _Restore_ your nodes via `Menu` -> `Import` -> `Paste flow.json` or `Select a file to import`.
1. _Deploy_ your changes.

## Node-RED as an addon on your CCU / [RedMatic](https://github.com/rdmtc/RedMatic)

**⚠️ WARNING: This section is NOT for the faint-hearted and needs validation**

- You may want to consider an upgrade of your Node-Red installaion within RedMatic: see https://github.com/rdmtc/RedMatic/issues/550#issuecomment-1228423177

From the RedMatic Addon-UI:

1. _Stop_ Node-Red via -> `Stop`

From your RedMatic host:

2. _Login_ via `ssh root@<ip>`
1. _Backup_ your files. See: https://github.com/rdmtc/RedMatic/wiki/Backup#manuelles-backup
1. _Navigate_ to the RedMatic installation root

    ```bash
    cd /usr/local/addons/redmatic/var
    ```

5. _Setup_ the environment:

    ```bash
    source /usr/local/addons/redmatic/home/.profile
    ```

6. **NOW** uninstall the old package and install the new one:

    - First read an understand also: https://github.com/rdmtc/RedMatic/wiki/Node-Installation

    ```bash
    npm uninstall --no-package-lock --global-style --save-prefix="~" --production node-red-contrib-ccu
    ```

    ```bash
    npm install --save --no-package-lock --global-style --save-prefix="~" --production @ptweety/node-red-contrib-ccu
    ```

    ```bash
    cd node_modules/
    ln -s @ptweety/node-red-contrib-ccu/ .
    ```

    - Maybe also add this line to `package.json`:

    ```
    {
        ...
        "dependencies": {
            "node-red-contrib-ccu": "file:./node_modules/@ptweety/node-red-contrib-ccu",
            ...
        }
        ...
    }
    ```

From the RedMatic Addon-UI;

7. _Start_ Node-Red via -> `Start`

## Node-RED in a Docker container

- Remind yourself of the installation instructions of [Node-RED](https://hub.docker.com/r/nodered/node-red)

From your Docker host:

1. Find you container and note the CONTAINER_ID:

    ```bash
    docker ps -f "label=org.label-schema.name=Node-RED"
    docker ps -f ancestor=nodered/node-red
    ```

2. Save your container ID:

    ```bash
    export CONTAINER_ID=...
    ```

3. Backup your flows:

    ```bash
    docker cp $CONTAINER_ID:/data/flows.json .
    docker cp $CONTAINER_ID:/data/flows_cred.json .
    ```

4. Execute an interactive shell on the container:

    ```bash
    docker exec -it $CONTAINER_ID /bin/bash
    ```

5. Inside the container navigate to your `/data` folder:

    ```bash
    cd /data/
    ```

6. **NOW** uninstall the old package and install the new one:

    ```bash
    npm uninstall node-red-contrib-ccu
    npm cache verify
    npm install @ptweety/node-red-contrib-ccu
    ```
7. Leave the container with `exit`.
1. (Optional) Restart your Node-Red container

    ```bash
    docker container restart $CONTAINER_ID
    ```
