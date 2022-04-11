import fs from 'fs'
import path from 'path'
import { controllerServiceFactory } from './server.controller';
import express from 'express'
import EventService from './services/EventService';
import LogService from './services/LogService'
import enforceTokenAuth from './middleware/enforceTokenAuth';

const { NODE_ENV } = process.env

export module ApplicationServer {

    export function start(port: string | number, sourceDir: string) {

        let _server: any;

        function recurseAndRegisterControllers(dir: string): void {

            for (var item of fs.readdirSync(dir).filter(i => path.extname(i).toLowerCase() !== '.map')) {

                const p = path.join(dir, item);

                if (fs.lstatSync(p).isDirectory()) {

                    return recurseAndRegisterControllers(p);
                }

                if (!path.extname(p)) { return; }

                const fileName = p.replace(/\\/g, '/');

                const controller = require(path.resolve(fileName));

                registerControllerToExpressEndpoints(controller);
            }

            controllerServiceFactory().validateAndClear()
        }

        function registerControllerToExpressEndpoints(controllerDir: any) {

            for (let controller of Object.values(controllerDir)) {

                const ctlName = (<any>controller).name;

                for (let { path, fn, httpVerb }  of controllerServiceFactory().getEndpoints(ctlName)) {

                    // this is where endpoint calls are invoked at run-time
                    _server[httpVerb](path, fn);
                }
            }
        }

        _server = express()

        _server.use(express.json())

        if (NODE_ENV === 'development') {

            _server.use(LogService);
        }

        _server.use(enforceTokenAuth)

        recurseAndRegisterControllers(sourceDir)

        _server.listen(port, () => {

            EventService.publish('server-init')

            console.log(`server running at port ${port}`)

        })

        return _server
    }
}