#[cfg(test)]
mod tests {
	use base64::prelude::BASE64_STANDARD;
	use base64::Engine;
	use std::sync::Arc;
	use tutasdk::bindings::rest_client::{HttpMethod, RestClient};
	use tutasdk::bindings::test_rest_client::TestRestClient;
	use tutasdk::login::{CredentialType, Credentials};
	use tutasdk::GeneratedId;
	use tutasdk::{IdTupleGenerated, Sdk};

	#[tokio::test]
	async fn download_mail_with_logged_in_client() {
		let rest_client = make_rest_client();

		// password is qawsedrftgyh
		let encrypted_passphrase_key = BASE64_STANDARD.decode("AZWEA/KTrHu0bW52CsctsBTTV4U3jrU51TadSxf6Nqs3xbEs3WfoOpPtxUDCNjHNppt6LHCfgTioejjGUJ2cCsXosZAysUiau5Nvyi8mtjLz").unwrap();

		let credentials = Credentials {
			login: "bed-free@tutanota.de".to_string(),
			user_id: GeneratedId("O1qC700----0".to_owned()),
			access_token: "ZC2NIBDACUABAdJhibIwclzaPU3fEu-NzQ".to_string(),
			encrypted_passphrase_key,
			credential_type: CredentialType::Internal,
		};
		let sdk = Sdk::new("http://localhost:9000".to_string(), rest_client);
		let logged_in_sdk = sdk.login(credentials).await.unwrap();
		//TODO refactor tuta-sdk/rust/sdk/tests/download_mail_test to use attributeIds instead of attributeName
		let mail_facade = logged_in_sdk.mail_facade();
		let mail = mail_facade
			.load_email_by_id_encrypted(&IdTupleGenerated {
				list_id: GeneratedId("O1qC705-17-0".to_string()),
				element_id: GeneratedId("O1qC7an--3-0".to_string()),
			})
			.await
			.unwrap();

		assert_eq!("Html email features", mail.subject);
		assert_eq!(1, mail.recipientCount);
		assert_eq!("bed-free@tutanota.de", mail.firstRecipient.unwrap().address);
		assert_eq!("map-free@tutanota.de", mail.sender.address);
		assert_eq!("Matthias", mail.sender.name);
		assert_eq!(1721043814832, mail.receivedDate.as_millis());
	}

	fn make_rest_client() -> Arc<dyn RestClient> {
		let mut client = TestRestClient::default();

		client.insert_response(
			"http://localhost:9000/rest/sys/Session/O1qC702-1J-0/3u3i8Lr9_7TnDDdAVw7w3TypTD2k1L00vIUTMF0SIPY",
							   HttpMethod::GET,
							   200,
							   None,
							   Some(include_bytes!("download_mail_test/session.json"))
		);

		client.insert_response(
			"http://localhost:9000/rest/sys/User/O1qC700----0",
			HttpMethod::GET,
			200,
			None,
			Some(include_bytes!("download_mail_test/session.json")),
		);

		client.insert_response(
			"http://localhost:9000/rest/sys/User/O1qC700----0",
			HttpMethod::GET,
			200,
			None,
			Some(include_bytes!("download_mail_test/user.json")),
		);

		client.insert_response(
			"http://localhost:9000/rest/tutanota/Mail/O1qC705-17-0/O1qC7an--3-0",
			HttpMethod::GET,
			200,
			None,
			Some(include_bytes!("download_mail_test/mail.json")),
		);

		Arc::new(client)
	}
}
