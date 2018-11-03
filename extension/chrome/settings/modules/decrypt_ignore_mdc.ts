/* © 2016-2018 FlowCrypt Limited. Limitations apply. Contact human@flowcrypt.com */

'use strict';

import { Catch, Env, Dict } from '../../../js/common/common.js';
import { Xss, Ui, XssSafeFactory } from '../../../js/common/browser.js';
import { Pgp, DecryptErrTypes } from '../../../js/common/pgp.js';
import { BrowserMsg } from '../../../js/common/extension.js';

declare const openpgp: typeof OpenPGP;

Catch.try(async () => {

  let urlParams = Env.urlParams(['account_email', 'parent_tab_id']);
  let account_email = Env.urlParamRequire.string(urlParams, 'account_email');
  let parent_tab_id = Env.urlParamRequire.string(urlParams, 'parent_tab_id');

  openpgp.config.ignore_mdc_error = true; // will only affect OpenPGP in local frame

  let tab_id = await BrowserMsg.required_tab_id();

  let orig_content: string;

  let factory = new XssSafeFactory(account_email, tab_id);

  BrowserMsg.listen({
    close_dialog: () => {
      $('.passphrase_dialog').text('');
    },
  }, tab_id);

  $('.action_decrypt').click(Ui.event.prevent('double', async self => {
    let encrypted = $('.input_message').val() as string;
    if (!encrypted) {
      alert('Please paste an encrypted message');
      return;
    }
    orig_content = $(self).html();
    Xss.sanitizeRender(self, 'Decrypting.. ' + Ui.spinner('white'));
    let result = await Pgp.msg.decrypt(account_email, encrypted);
    if (result.success) {
      alert(`MESSAGE CONTENT BELOW\n---------------------------------------------------------\n${result.content.text!}`);
    } else if (result.error.type === DecryptErrTypes.need_passphrase) {
      $('.passphrase_dialog').html(factory.embedded_passphrase(result.longids.need_passphrase)); // xss-safe-factory
    } else {
      delete result.message;
      console.info(result);
      alert('These was a problem decrypting this file, details are in the console.');
    }
    Xss.sanitizeRender(self, orig_content);
  }));

})();
