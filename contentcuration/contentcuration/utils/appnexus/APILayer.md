## API Layer Documentation

### Overview

Within the `contentcuration` app in Studio, we want to build an API layer that acts as a communication bridge with different backends like Docker Images, Google Cloud Platform's Vertex AI, and VM instances, cloud storage services, etc. The goal is to make sure this API layer can work with these backends, regardless of where or how they do the job. As long as the input and output formats stay the same, this setup provides flexibility in choosing and using backend resources.

### Description and outcomes

The stand-alone deployed backend service(s) will not have direct access to `contentcuration` models or the database for that matter, so this API layer facilitates access to these resources by receiving and returning a standardized requests and responses, irrespective of the backend interacted with.

#### The Architecture

<img width="1178" alt="Screenshot 2023-09-11 at 14 50 06" src="https://github.com/learningequality/studio/assets/5203639/05f64be8-af39-466b-9e13-00426d07b7ff">

The key components of this architecture are as follows:

#### 1. Creating the Backend Interface

The Backend class serves as an abstract interface that outlines the operations all backends must support. It implements the Singleton pattern to ensure that only one instance of each backend type can exist. The methods defined by the Backend class are:

```python
ABSTRACT CLASS Backend:
	_instance = None # Private variable to hold the instance

	ABSTRACT METHOD connect()
		# Provides blue print to connect
		pass

	ABSTRACT METHOD make_request(params)
		# provide blue print to make request
		pass

    ABSTRACT METHOD request(params)
		# provide blue print for the request object
		pass
	
	ABSTRACT METHOD response(params)
		# provides blue print for the response object
		pass

	CLASS METHOD get_instance(cls)
		IF cls._instance is None:
			cls._instance = cls._create_instance()
		return cls._instance

	CLASS METHOD _create_instance(cls)
		raise NotImplementedError # concrete class must implement
```

Different backends can now be created by implementing the base `Backend` class:

```python
# Implement CONCRETE CLASS using ABSTRACT Backend class
CLASS GCS IMPLEMENTS Backend:
	METHOD make_request(params):
		# make request to Google Cloud Storage services

	METHOD connect(params):
		# Implement the connect method for GCS

	CLASS METHOD _create_instance(cls)
		# initialize a GCS Backend instance

CLASS ML IMPLEMENTS Backend:
	METHOD make_request(params):
		# make request to DeepLearning models hosted as service

	METHOD connect(params):
		# Implement the connect method for hosted ML service

	CLASS METHOD _create_instance(cls)
		# initialize a ML Backend instance

CLASS OtherBackend IMPLEMENTS Backend:
	...
	[you get the idea]
```

To create an instance  of a backend, using  the `ML` class as an example, use the `get_instance()` method:

```python
>>> backend = ML.get_instance()
```

To centralize the creation of `Backend` instances based on specific Django settings(e.g. dev vs. production environments),  create `BackendFactory` class. This should follow the Factory Design Pattern.

```python
# Factory to instantiate the Backend based on Django Settings
CLASS BackendFactory:
	METHOD create_backend(self, backend=None) -> Backend
		IF backend:
			return backend
		ELSE:
			# Create an Adapter instance based on Django settings
			IF DjangoSettings is 'SomeSetting':
				backend = GCS.get_instance() # Use of Singleton pattern
			ELSE IF DjangoSettings is 'AnotherSetting':
				backend = ML.get_instance()
			ELSE
				RAISE ValueError
		# Return the created Backend instance
		RETURN backend
```
The `BackendFactory`'s `create_backend` method optionally allows a `Backend` instance to be injected into the factory instead of relying solely on Django settings. This is particularly useful if we want to explicitly specify the backend to use.

### Creating Adapter that accepts any Backend

The **`Adapter`** class can be initialized with a `Backend` instance(optional) which provides a `make_request` method that forwards requests to the chosen `Backend`, while adhering to its specific `request` and `response` formats.

```python
CLASS Adapter:

	METHOD __init__(self, backend(Optional) defaults None)
		# Initialize the Backend with BackendFactory
		backend_factory = BackendFactory()
		SET backend = backend_factory.create_backend(backend)

	METHOD request(self):
		# something
		return self.backend.request()

	METHOD response(self):
		# something
		return self.backend.response()
```

With this `Adapter` class in place, we can create Adapter that are able interact with any backend we need.

```python
CLASS Recommendation INHERITS ADAPTER:
	METHOD generateEmbeddings(self, params) -> Boolean
		# [ Implementation ]

	METHOD getRecommendation(self, params) -> Array
		# [ Implementation ]

CLASS Transcription INHERITS ADAPTER:
	METHOD generateCaption(self, params) -> Array
		# [ Implementation ]

CLASS OtherAdapter INHERITS ADAPTER:
	METHOD someOperation(self, params) -> Any
		# Operation that any backend wants
```

Below is a sample use case, using the `ML` backend as an example:

```python
>>> backend = ML.get_instance()
>>> adapter =  Transcription(backend)
```

To access specific methods within the adapter:

```python
>>> adapter.generateCaption(...)
```

### Resources

[OOP Design patterns](https://refactoring.guru/design-patterns/catalog)
