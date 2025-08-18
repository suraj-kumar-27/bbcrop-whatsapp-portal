import apiLogs from './api/controllers/apiLogs/routes';
import whatsapp from './api/controllers/whatsapp/routes';




/**
 *
 *
 * @export
 * @param {any} app
 */

export default function routes(app) {

  app.use('/api/v1/apiLogs', apiLogs)
  app.use('/api/v1/whatsapp', whatsapp)



  return app;
}
