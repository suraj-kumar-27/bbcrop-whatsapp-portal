import apiLogs from './api/controllers/apiLogs/routes';
import crmApiLogs from './api/controllers/crmApiLogs/routes';
import deposit from './api/controllers/deposit/routes';
import withdrawal from './api/controllers/withdrawal/routes';
import transfer from './api/controllers/transfer/routes';
import account from './api/controllers/account/routes';
import whatsapp from './api/controllers/whatsapp/routes';
import auth from './api/controllers/auth/routes';
import user from './api/controllers/user/routes';
import role from './api/controllers/role/routes';




/**
 *
 *
 * @export
 * @param {any} app
 */

export default function routes(app) {

  app.use('/api/v1/auth', auth)
  app.use('/api/v1/user', user)
  app.use('/api/v1/role', role)
  app.use('/api/v1/apiLogs', apiLogs)
  app.use('/api/v1/crmApiLogs', crmApiLogs)
  app.use('/api/v1/deposit', deposit)
  app.use('/api/v1/withdrawal', withdrawal)
  app.use('/api/v1/transfer', transfer)
  app.use('/api/v1/account', account)
  app.use('/api/v1/whatsapp', whatsapp)

  return app;
}
