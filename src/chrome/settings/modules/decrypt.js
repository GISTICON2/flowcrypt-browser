/* Business Source License 1.0 © 2016 Tom James Holub (tom@cryptup.org). Use limitations apply. This version will change to GPLv3 on 2020-01-01. See https://github.com/tomholub/cryptup-chrome/tree/master/src/LICENCE */

'use strict';

var url_params = tool.env.url_params(['account_email', 'parent_tab_id']);

db_open(function (db) {
  chrome_message_get_tab_id(function (tab_id) {

    var original_content;
    var missing_passprase_longids = [];

    var attach_js = init_shared_attach_js(1);
    attach_js.initialize_attach_dialog('fineuploader', 'fineuploader_button')
    init_elements_factory_js();

    chrome_message_listen({
      close_dialog: function () {
        $('.passphrase_dialog').html('');
        $.each(missing_passprase_longids, function (i, longid) {
          // todo - copy pasted from attachment.js, unify into a single function
          // further - this approach is outdated and will not properly deal with WRONG passphrases that changed (as opposed to missing)
          // see pgp_block.js for proper common implmenetation
          if(missing_passprase_longids && get_passphrase(url_params.account_email, longid) !== null) {
            missing_passprase_longids = [];
            $('.action_decrypt_and_download').click();
            return false;
          }
        });
      },
    }, tab_id);

    $('.action_decrypt_and_download').click(prevent(doubleclick(), function (self) {
      var ids = attach_js.get_attachment_ids();
      if(ids.length === 1) {
        original_content = $(self).html();
        $(self).html('Decrypting.. ' + get_spinner());
        attach_js.collect_attachment(ids[0], decrypt_and_download);
      } else {
        alert('Please add a file to decrypt');
      }
    }));

    function decrypt_and_download(encrypted_file) { // todo - this is more or less copy-pasted from attachment.js, should use common function
      decrypt(db, url_params.account_email, tool.str.from_uint8(encrypted_file.data), undefined, function (result) {
        if(result.success) {
          save_file_to_downloads(encrypted_file.name.replace(/(\.pgp)|(\.gpg)$/, ''), encrypted_file.type, result.content.data);
        } else if((result.missing_passphrases || []).length) {
          missing_passprase_longids = result.missing_passphrases;
          $('.passphrase_dialog').html(passphrase_dialog(url_params.account_email, 'embedded', missing_passprase_longids, tab_id));
        } else {
          delete result.message;
          console.log(result);
          alert('These was a problem decrypting this file, details are in the console.');
        }
        $('.action_decrypt_and_download').html(original_content);
      });
    }

  });
});
