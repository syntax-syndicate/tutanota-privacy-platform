use crate::bindings::rest_client::{HttpMethod, RestClient, RestClientOptions, RestResponse};
use crate::bindings::suspendable_rest_client::SuspensionBehavior;
use crate::element_value::{ElementValue, ParsedEntity};
use crate::entities::entity_facade::{ID_FIELD, PERMISSIONS_FIELD};
use crate::entities::generated::base::PersistenceResourcePostReturn;
use crate::entities::Entity;
use crate::id::id_tuple::{BaseIdType, IdTupleType, IdType};
use crate::instance_mapper::InstanceMapper;
use crate::json_element::{JsonElement, RawEntity};
use crate::json_serializer::JsonSerializer;
use crate::metamodel::{ElementType, TypeModel};
use crate::rest_error::HttpError;
use crate::type_model_provider::TypeModelProvider;
use crate::{ApiCallError, HeadersProvider, IdTupleCustom, ListLoadDirection, TypeRef};
use crate::{GeneratedId, IdTupleGenerated};
use std::sync::Arc;

/// A high level interface to manipulate unencrypted entities/instances via the REST API
pub struct EntityClient {
	rest_client: Arc<dyn RestClient>,
	base_url: String,
	auth_headers_provider: Arc<HeadersProvider>,
	json_serializer: Arc<JsonSerializer>,
	pub type_model_provider: Arc<TypeModelProvider>,
}

impl EntityClient {
	pub(crate) fn new(
		rest_client: Arc<dyn RestClient>,
		json_serializer: Arc<JsonSerializer>,
		base_url: String,
		auth_headers_provider: Arc<HeadersProvider>,
		type_model_provider: Arc<TypeModelProvider>,
	) -> Self {
		EntityClient {
			rest_client,
			json_serializer,
			base_url,
			auth_headers_provider,
			type_model_provider,
		}
	}

	#[allow(clippy::unused_async, unused)]
	/// Gets an entity/instance of type `type_ref` from the backend
	pub async fn load<Id: IdType>(
		&self,
		type_ref: &TypeRef,
		id: &Id,
	) -> Result<ParsedEntity, ApiCallError> {
		let type_name = self.get_type_model(type_ref)?.name;

		let url = format!(
			"{}/rest/{}/{}/{}",
			self.base_url, type_ref.app, type_name, id
		);
		let response_bytes = self
			.prepare_and_fire(type_ref, url)
			.await?
			.expect("no body");
		let response_entity =
			serde_json::from_slice::<RawEntity>(response_bytes.as_slice()).unwrap();
		let parsed_entity = self.json_serializer.parse(type_ref, response_entity)?;
		Ok(parsed_entity)
	}

	/// Returns the definition of an entity/instance type using the internal `TypeModelProvider`
	pub fn get_type_model(&self, type_ref: &TypeRef) -> Result<&TypeModel, ApiCallError> {
		self.type_model_provider
			.resolve_type_ref(type_ref)
			.ok_or_else(|| {
				ApiCallError::internal(format!(
					"Model {} not found in app {}",
					type_ref.type_id, type_ref.app
				))
			})
	}

	/// Fetches and returns all entities/instances in a list element type
	#[allow(clippy::unused_async)]
	pub async fn load_all(
		&self,
		_type_ref: &TypeRef,
		_list_id: &GeneratedId,
		_start: Option<String>,
	) -> Result<Vec<ParsedEntity>, ApiCallError> {
		todo!("entity client load_all")
	}

	/// Fetches and returns a specified number (`count`) of entities/instances
	/// in a list element type starting at the index `start_id`
	#[allow(clippy::unused_async)]
	pub async fn load_range<Id: BaseIdType>(
		&self,
		type_ref: &TypeRef,
		list_id: &GeneratedId,
		start_id: &Id,
		count: usize,
		direction: ListLoadDirection,
	) -> Result<Vec<ParsedEntity>, ApiCallError> {
		let type_model = self.get_type_model(type_ref)?;
		assert_eq!(
			type_model.element_type,
			ElementType::ListElement,
			"cannot load range for non-list element"
		);
		let reverse = direction == ListLoadDirection::DESC;
		let url = format!(
			"{}/rest/{}/{}/{}?start={start_id}&count={count}&reverse={reverse}",
			self.base_url, type_ref.app, type_model.name, list_id
		);
		let response_bytes = self
			.prepare_and_fire(type_ref, url)
			.await?
			.expect("no body");
		let response_entities = serde_json::from_slice::<Vec<RawEntity>>(response_bytes.as_slice())
			.expect("invalid response");
		let parsed_entities = response_entities
			.into_iter()
			.map(|e| self.json_serializer.parse(type_ref, e))
			.collect::<Result<Vec<_>, _>>()?;
		Ok(parsed_entities)
	}

	async fn post_instance_changes(
		&self,
		parsed_entity: ParsedEntity,
		type_ref: &TypeRef,
		request_type: HttpMethod,
	) -> Result<RestResponse, ApiCallError> {
		let type_model = self.get_type_model(type_ref)?;

		let mut request_url = format!(
			"{}/rest/{}/{}/",
			self.base_url, type_ref.app, type_model.name
		);
		let model_version_str = type_model.version;
		let model_version = model_version_str.parse::<u32>().map_err(|_e| {
			ApiCallError::internal(format!(
				"Expected version to be u32 compatible. Found: {model_version_str}"
			))
		})?;

		let id_field_attribute_id = &type_model
			.get_attribute_id_by_attribute_name(ID_FIELD)
			.map_err(|err| ApiCallError::InternalSdkError {
				error_message: format!(
					"{ID_FIELD} attribute does not exist on the type model with typeId {:?} {:?}",
					type_model.id, err
				),
			})?;

		let entity_id = parsed_entity
			.get(id_field_attribute_id)
			.filter(|id| !matches!(id, ElementValue::Null))
			.ok_or_else(|| {
				ApiCallError::internal(
					"_id field have to be set while updating the instance".to_string(),
				)
			})?
			.clone();

		let mut raw_entity = self.json_serializer.serialize(type_ref, parsed_entity)?;
		let (list_id, element_id) = match entity_id {
			ElementValue::IdTupleGeneratedElementId(IdTupleGenerated {
				list_id,
				element_id,
			}) => (Some(list_id), element_id.to_string()),

			ElementValue::IdTupleCustomElementId(IdTupleCustom {
				list_id,
				element_id,
			}) => (Some(list_id), element_id.to_string()),

			ElementValue::IdGeneratedId(element_id) => (None, element_id.to_string()),
			ElementValue::IdCustomId(element_id) => (None, element_id.to_string()),

			_ => panic!("Invalid type of _id for TypeRef: {type_ref}"),
		};

		if let Some(list_id) = list_id {
			request_url.push_str(list_id.as_str());
		}

		let permissions_field_attribute_id = &type_model
			.get_attribute_id_by_attribute_name(PERMISSIONS_FIELD)
			.map_err(|err| ApiCallError::InternalSdkError {
				error_message: format!(
					"{PERMISSIONS_FIELD} attribute does not exist on the type model with typeId {:?} {:?}",
					type_model.id,
					err
				),
			})?;

		if request_type == HttpMethod::POST {
			raw_entity.insert(id_field_attribute_id.to_string(), JsonElement::Null);
			raw_entity.insert(
				permissions_field_attribute_id.to_string(),
				JsonElement::Null,
			);
		} else {
			request_url.push('/');
			request_url.push_str(element_id.as_str());
		}

		let body = serde_json::to_vec(&raw_entity).map_err(|_| {
			ApiCallError::internal("Cannot serialize RawEntity to json".to_string())
		})?;
		let mut options = RestClientOptions {
			body: Some(body),
			headers: self.auth_headers_provider.provide_headers(model_version),
			suspension_behavior: Some(SuspensionBehavior::Suspend),
		};
		options
			.headers
			.insert("Content-Type".to_owned(), "application/json".to_owned());

		let response = self
			.rest_client
			.request_binary(request_url, request_type, options)
			.await?;

		Ok(response)
	}

	#[allow(clippy::unused_async)]
	pub async fn create_instance(
		&self,
		type_ref: &TypeRef,
		parsed_entity: ParsedEntity,
		instance_mapper: &InstanceMapper,
	) -> Result<PersistenceResourcePostReturn, ApiCallError> {
		let response = self
			.post_instance_changes(parsed_entity, type_ref, HttpMethod::POST)
			.await?;

		assert!(
			response.status >= 200 && response.status <= 300,
			"non-ok status code"
		);

		let raw_response = response
			.body
			.as_deref()
			.and_then(|body| serde_json::from_slice(body).ok())
			.ok_or_else(|| {
				ApiCallError::internal("server did not responded with valid json".to_string())
			})?;

		let response_entity = self
			.json_serializer
			.parse(&PersistenceResourcePostReturn::type_ref(), raw_response)
			.map_err(|e| {
				ApiCallError::internal_with_err(
					e,
					"PersistenceResourcePostReturn returned by server is expected to be valid",
				)
			})?;

		let persistent_resource = instance_mapper
			.parse_entity(response_entity)
			.map_err(|_e| {
				ApiCallError::internal(
					"Cannot convert ParsedEntity to valid PersistenceResourcePostReturn"
						.to_string(),
				)
			})?;

		Ok(persistent_resource)
	}

	#[allow(clippy::unused_async)]
	pub async fn update_instance(
		&self,
		type_ref: &TypeRef,
		parsed_entity: ParsedEntity,
	) -> Result<(), ApiCallError> {
		let response = self
			.post_instance_changes(parsed_entity, type_ref, HttpMethod::PUT)
			.await?;
		assert!(
			response.status >= 200 && response.status <= 299,
			"non-ok status code {}",
			response.status
		);
		Ok(())
	}

	/// Deletes an existing single entity/instance on the backend
	#[allow(clippy::unused_async, unused)]
	pub async fn erase_element(
		&self,
		_type_ref: &TypeRef,
		_id: &GeneratedId,
	) -> Result<(), ApiCallError> {
		todo!("entity client erase_element")
	}

	/// Deletes an existing entity/instance of a list element type on the backend
	#[allow(clippy::unused_async, unused)]
	pub async fn erase_list_element<Id: IdTupleType>(
		&self,
		_type_ref: &TypeRef,
		_id: Id,
	) -> Result<(), ApiCallError> {
		todo!("entity client erase_list_element")
	}

	async fn prepare_and_fire(
		&self,
		type_ref: &TypeRef,
		url: String,
	) -> Result<Option<Vec<u8>>, ApiCallError> {
		let type_model = self.get_type_model(type_ref)?;
		let model_version: u32 = type_model.version.parse().expect("invalid model_version");
		let options = RestClientOptions {
			body: None,
			headers: self.auth_headers_provider.provide_headers(model_version),
			suspension_behavior: Some(SuspensionBehavior::Suspend),
		};
		let response = self
			.rest_client
			.request_binary(url, HttpMethod::GET, options)
			.await?;

		match response.status {
			200..=299 => {
				// Ok
			},
			_ => {
				let precondition = response.headers.get("precondition");
				return Err(ApiCallError::ServerResponseError {
					source: HttpError::from_http_response(response.status, precondition)?,
				});
			},
		}
		Ok(response.body)
	}
}

#[cfg(test)]
mockall::mock! {
	pub EntityClient {
		pub fn new(
			rest_client: Arc<dyn RestClient>,
			json_serializer: Arc<JsonSerializer>,
			base_url: String,
			auth_headers_provider: Arc<HeadersProvider>,
			type_model_provider: Arc<TypeModelProvider>,
		) -> Self;
		pub fn get_type_model_provider() -> Arc<TypeModelProvider>;
		pub fn get_type_model(&self, type_ref: &TypeRef) -> Result<&'static TypeModel, ApiCallError>;
		pub async fn load<Id: IdType>(
			&self,
			type_ref: &TypeRef,
			id: &Id,
		 ) -> Result<ParsedEntity, ApiCallError>;
		pub async fn load_all(
			&self,
			type_ref: &TypeRef,
			list_id: &GeneratedId,
			start: Option<String>,
		) -> Result<Vec<ParsedEntity>, ApiCallError>;
		pub async fn load_range<Id: BaseIdType>(
			&self,
			type_ref: &TypeRef,
			list_id: &GeneratedId,
			start_id: &Id,
			count: usize,
			list_load_direction: ListLoadDirection,
		) -> Result<Vec<ParsedEntity>, ApiCallError>;
		pub async fn setup_element(&self, type_ref: &TypeRef, entity: RawEntity) -> Vec<String>;
		pub async fn setup_list_element(
			&self,
			type_ref: &TypeRef,
			list_id: &GeneratedId,
			entity: RawEntity,
		) -> Vec<String>;
		pub async fn update(&self, type_ref: &TypeRef, entity: ParsedEntity) -> Result<(), ApiCallError>;
		pub async fn erase_element(&self, type_ref: &TypeRef, id: &GeneratedId) -> Result<(), ApiCallError>;
		pub async fn erase_list_element<Id: IdTupleType>(&self, type_ref: &TypeRef, id: Id) -> Result<(), ApiCallError>;
		async fn post_instance_changes( &self, parsed_entity: ParsedEntity, type_ref: &TypeRef, request_type: HttpMethod,
			) -> Result<RestResponse, ApiCallError>;
		pub async fn update_instance(&self, type_ref: &TypeRef, parsed_entity: ParsedEntity) -> Result<(), ApiCallError>;
		pub async fn create_instance(&self, type_ref: &TypeRef, parsed_entity: ParsedEntity, instance_mapper: &InstanceMapper)
			-> Result<PersistenceResourcePostReturn, ApiCallError>;
	}
}

#[cfg(test)]
mod tests {
	use std::collections::HashMap;

	use super::*;
	use crate::bindings::rest_client::{MockRestClient, RestResponse};
	use crate::entities::Entity;
	use crate::metamodel::{Cardinality, ModelValue, ValueType};
	use crate::util::get_attribute_id_by_attribute_name;
	use crate::CustomId;
	use crate::{collection, str_map, IdTupleCustom, IdTupleGenerated};
	use mockall::predicate::{always, eq};
	use serde::{Deserialize, Serialize};

	#[derive(Clone, Serialize, Deserialize, Debug, PartialEq)]
	struct TestListGeneratedElementIdEntity {
		#[serde(rename = "101")]
		_id: IdTupleGenerated,
		#[serde(rename = "102")]
		field: String,
	}

	#[derive(Clone, Serialize, Deserialize, Debug, PartialEq)]
	struct TestListCustomElementIdEntity {
		#[serde(rename = "201")]
		_id: IdTupleCustom,
		#[serde(rename = "202")]
		field: String,
	}

	impl Entity for TestListGeneratedElementIdEntity {
		fn type_ref() -> TypeRef {
			TypeRef {
				app: "entityClientTestApp",
				type_id: 10,
			}
		}
	}

	impl Entity for TestListCustomElementIdEntity {
		fn type_ref() -> TypeRef {
			TypeRef {
				app: "entityClientTestApp",
				type_id: 20,
			}
		}
	}

	#[tokio::test]
	async fn test_load_range_generated_element_id() {
		let mut type_provider = TypeModelProvider::new();
		mock_type_model_provider(&mut type_provider);
		let type_model_provider = Arc::new(type_provider);

		let list_id = GeneratedId("list_id".to_owned());
		let entity_map: ParsedEntity = collection! {
			get_attribute_id_by_attribute_name(TestListGeneratedElementIdEntity::type_ref(), ID_FIELD).unwrap() => ElementValue::IdTupleGeneratedElementId(IdTupleGenerated::new(list_id.clone(), GeneratedId("element_id".to_owned()))),
			get_attribute_id_by_attribute_name(TestListGeneratedElementIdEntity::type_ref(), "field").unwrap() => ElementValue::Bytes(vec![1, 2, 3])
		};
		println!("{}", serde_json::to_string_pretty(&entity_map).unwrap());
		let mut rest_client = MockRestClient::new();
		let url = "http://test.com/rest/entityClientTestApp/TestListGeneratedElementIdEntity/list_id?start=zzzzzzzzzzzz&count=100&reverse=true";
		let json_folder = JsonSerializer::new(type_model_provider.clone())
			.serialize(
				&TestListGeneratedElementIdEntity::type_ref(),
				entity_map.clone(),
			)
			.unwrap();
		rest_client
			.expect_request_binary()
			.with(eq(url.to_owned()), eq(HttpMethod::GET), always())
			.return_once(move |_, _, _| {
				Ok(RestResponse {
					status: 200,
					headers: HashMap::default(),
					body: Some(serde_json::to_vec(&vec![json_folder]).unwrap()),
				})
			});

		let auth_headers_provider = HeadersProvider::new(Some("123".to_owned()));
		let entity_client = EntityClient::new(
			Arc::new(rest_client),
			Arc::new(JsonSerializer::new(type_model_provider.clone())),
			"http://test.com".to_owned(),
			Arc::new(auth_headers_provider),
			type_model_provider.clone(),
		);

		let result_entity = entity_client
			.load_range(
				&TestListGeneratedElementIdEntity::type_ref(),
				&list_id,
				&GeneratedId::max_id(),
				100,
				ListLoadDirection::DESC,
			)
			.await
			.expect("success");
		assert_eq!(result_entity, vec![entity_map]);
	}

	#[tokio::test]
	async fn test_load_range_custom_element_id() {
		let mut type_provider = TypeModelProvider::new();
		mock_type_model_provider(&mut type_provider);
		let type_model_provider = Arc::new(type_provider);

		let list_id = GeneratedId("list_id".to_owned());
		let entity_map: ParsedEntity = collection! {
			get_attribute_id_by_attribute_name(TestListCustomElementIdEntity::type_ref(), ID_FIELD).unwrap() => ElementValue::IdTupleCustomElementId(IdTupleCustom::new(list_id.clone(), CustomId("element_id".to_owned()))),
			get_attribute_id_by_attribute_name(TestListCustomElementIdEntity::type_ref(), "field").unwrap() => ElementValue::Bytes(vec![1, 2, 3])
		};
		let mut rest_client = MockRestClient::new();
		let url = "http://test.com/rest/entityClientTestApp/TestListCustomElementIdEntity/list_id?start=zzzzzzzzzzzz&count=100&reverse=true";
		let json_folder = JsonSerializer::new(type_model_provider.clone())
			.serialize(
				&TestListCustomElementIdEntity::type_ref(),
				entity_map.clone(),
			)
			.unwrap();
		rest_client
			.expect_request_binary()
			.with(eq(url.to_owned()), eq(HttpMethod::GET), always())
			.return_once(move |_, _, _| {
				Ok(RestResponse {
					status: 200,
					headers: HashMap::default(),
					body: Some(serde_json::to_vec(&vec![json_folder]).unwrap()),
				})
			});

		let auth_headers_provider = HeadersProvider::new(Some("123".to_owned()));
		let entity_client = EntityClient::new(
			Arc::new(rest_client),
			Arc::new(JsonSerializer::new(type_model_provider.clone())),
			"http://test.com".to_owned(),
			Arc::new(auth_headers_provider),
			type_model_provider.clone(),
		);

		let result_entity = entity_client
			.load_range(
				&TestListCustomElementIdEntity::type_ref(),
				&list_id,
				&CustomId("zzzzzzzzzzzz".to_owned()),
				100,
				ListLoadDirection::DESC,
			)
			.await
			.expect("success");
		assert_eq!(result_entity, vec![entity_map]);
	}

	#[tokio::test]
	async fn test_load_range_asc_generated_element_id() {
		let mut type_provider = TypeModelProvider::new();
		mock_type_model_provider(&mut type_provider);
		let type_model_provider = Arc::new(type_provider);

		let list_id = GeneratedId("list_id".to_owned());
		let entity_map: ParsedEntity = collection! {
			get_attribute_id_by_attribute_name(TestListGeneratedElementIdEntity::type_ref(), ID_FIELD).unwrap() => ElementValue::IdTupleGeneratedElementId(IdTupleGenerated::new(list_id.clone(), GeneratedId("element_id".to_owned()))),
			get_attribute_id_by_attribute_name(TestListGeneratedElementIdEntity::type_ref(), "field").unwrap() => ElementValue::Bytes(vec![1, 2, 3])
		};
		let mut rest_client = MockRestClient::new();
		let url = "http://test.com/rest/entityClientTestApp/TestListGeneratedElementIdEntity/list_id?start=------------&count=100&reverse=false";
		let json_folder = JsonSerializer::new(type_model_provider.clone())
			.serialize(
				&TestListGeneratedElementIdEntity::type_ref(),
				entity_map.clone(),
			)
			.unwrap();
		rest_client
			.expect_request_binary()
			.with(eq(url.to_owned()), eq(HttpMethod::GET), always())
			.return_once(move |_, _, _| {
				Ok(RestResponse {
					status: 200,
					headers: HashMap::default(),
					body: Some(serde_json::to_vec(&vec![json_folder]).unwrap()),
				})
			});

		let auth_headers_provider = HeadersProvider::new(Some("123".to_owned()));
		let entity_client = EntityClient::new(
			Arc::new(rest_client),
			Arc::new(JsonSerializer::new(type_model_provider.clone())),
			"http://test.com".to_owned(),
			Arc::new(auth_headers_provider),
			type_model_provider.clone(),
		);

		let result_entity = entity_client
			.load_range(
				&TestListGeneratedElementIdEntity::type_ref(),
				&list_id,
				&GeneratedId::min_id(),
				100,
				ListLoadDirection::ASC,
			)
			.await
			.expect("success");
		assert_eq!(result_entity, vec![entity_map]);
	}

	#[tokio::test]
	async fn test_load_range_asc_custom_element_id() {
		let mut type_provider = TypeModelProvider::new();
		mock_type_model_provider(&mut type_provider);
		let type_model_provider = Arc::new(type_provider);

		let list_id = GeneratedId("list_id".to_owned());
		let entity_map: ParsedEntity = collection! {
			get_attribute_id_by_attribute_name(TestListCustomElementIdEntity::type_ref(), ID_FIELD).unwrap() => ElementValue::IdTupleCustomElementId(IdTupleCustom::new(list_id.clone(), CustomId("element_id".to_owned()))),
			get_attribute_id_by_attribute_name(TestListCustomElementIdEntity::type_ref(), "field").unwrap() => ElementValue::Bytes(vec![1, 2, 3])
		};
		let mut rest_client = MockRestClient::new();
		let url = "http://test.com/rest/entityClientTestApp/TestListCustomElementIdEntity/list_id?start=------------&count=100&reverse=false";
		let json_folder = JsonSerializer::new(type_model_provider.clone())
			.serialize(
				&TestListCustomElementIdEntity::type_ref(),
				entity_map.clone(),
			)
			.unwrap();
		rest_client
			.expect_request_binary()
			.with(eq(url.to_owned()), eq(HttpMethod::GET), always())
			.return_once(move |_, _, _| {
				Ok(RestResponse {
					status: 200,
					headers: HashMap::default(),
					body: Some(serde_json::to_vec(&vec![json_folder]).unwrap()),
				})
			});

		let auth_headers_provider = HeadersProvider::new(Some("123".to_owned()));
		let entity_client = EntityClient::new(
			Arc::new(rest_client),
			Arc::new(JsonSerializer::new(type_model_provider.clone())),
			"http://test.com".to_owned(),
			Arc::new(auth_headers_provider),
			type_model_provider.clone(),
		);

		let result_entity = entity_client
			.load_range(
				&TestListCustomElementIdEntity::type_ref(),
				&list_id,
				&CustomId("------------".to_owned()),
				100,
				ListLoadDirection::ASC,
			)
			.await
			.expect("success");
		assert_eq!(result_entity, vec![entity_map]);
	}

	// note:
	// maybe we should have only one of this and test_services#extend_model_resolver
	fn mock_type_model_provider(type_model_provider: &mut TypeModelProvider) {
		let list_entity_generated_type_model: TypeModel = TypeModel {
			id: 10,
			since: 1,
			app: "entityClientTestApp",
			version: "1",
			name: "TestListGeneratedElementIdEntity",
			element_type: ElementType::ListElement,
			versioned: false,
			encrypted: true,
			root_id: "",
			values: str_map! {
				101 => ModelValue {
						id: 101,
						name: "_id".to_string(),
						value_type: ValueType::GeneratedId,
						cardinality: Cardinality::One,
						is_final: true,
						encrypted: false,
					},
				102 =>
					ModelValue {
						id: 102,
						name: "field".to_string(),
						value_type: ValueType::String,
						cardinality: Cardinality::One,
						is_final: false,
						encrypted: true,
					},
			},
			associations: HashMap::default(),
		};

		let list_entity_custom_type_model: TypeModel = TypeModel {
			id: 20,
			since: 1,
			app: "entityClientTestApp",
			version: "1",
			name: "TestListCustomElementIdEntity",
			element_type: ElementType::ListElement,
			versioned: false,
			encrypted: true,
			root_id: "",
			values: str_map! {
				201 => ModelValue {
						id: 201,
						name: "_id".to_string(),
						value_type: ValueType::CustomId,
						cardinality: Cardinality::One,
						is_final: true,
						encrypted: false,
					},
				202 =>
					ModelValue {
						id: 202,
						name: "field".to_string(),
						value_type: ValueType::String,
						cardinality: Cardinality::One,
						is_final: false,
						encrypted: true,
					},
			},
			associations: HashMap::default(),
		};

		let test_types = [
			(
				list_entity_generated_type_model.id,
				list_entity_generated_type_model,
			),
			(
				list_entity_custom_type_model.id,
				list_entity_custom_type_model,
			),
		]
		.into_iter()
		.collect();

		unsafe {
			let app_models_mut = std::ptr::from_ref(type_model_provider.app_models)
				.cast_mut()
				.as_mut()
				.expect("Should be Not null");

			app_models_mut.insert("entityClientTestApp", test_types);
		}
	}
}
