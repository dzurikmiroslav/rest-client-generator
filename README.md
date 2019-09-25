# rest-client-generator


[![Build Status](https://travis-ci.org/dzurikmiroslav/rest-client-generator.svg?branch=master)](https://travis-ci.org/dzurikmiroslav/rest-client-generator)
[![NPM Version](https://img.shields.io/npm/v/rest-client-generator.svg)](https://www.npmjs.com/package/rest-client-generator)
[![License](http://img.shields.io/npm/l/rest-client-generator.svg)](https://www.npmjs.com/package/rest-client-generator)


Generate REST endpoint client from [Swagger](http://swagger.io/) or [WADL](http://www.w3.org/Submission/wadl/) for you project. Useful for typed languages such TypeScript and Dart. Currently support generation for platforms:
- [x] Angular6 TypeScript (via @angular/common/http)
- [x] Angular5 TypeScript (via @angular/common/http)
- [x] Angular2 TypeScript (via @angular/http)
- [ ] Angular2 Dart
- [ ] Dojo2 TypeScript

Features: 
- Request/response representation `application/json` is handled as interface
- Mimetypes such as `text/*`, `application/xml`, etc. are handled as strings
- Mimetype `application/octet-stream` is handled as [File](https://developer.mozilla.org/en-US/docs/Web/API/File)
- Other mimetypes are handled as [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- Translate date fields in response JSON to js Date object
- Full support XSD schema types (`xs:string`, `xs:number`, `xs:boolean`, `xs:datetime`, etc.)
- XSD schema enumeration handled as enum
- XSD schema extension handled as object inheritance
- Support fileupload in multipart/form-data


## Installation

Install globally rest-client-generator

```bash
npm install --global rest-client-generator
```


## Generate

### From WADL

Get some WADL schema, for example `app.wadl`:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<application xmlns="http://wadl.dev.java.net/2009/02">
    <grammars>
        <include href="app.xsd"/>
    </grammars>
    <resources base="http://localhost:8080/restapi/">
        <resource path="/auth">
            <resource path="/login">
                <method id="login" name="POST">
                    <request>
                        <param xmlns:xs="http://www.w3.org/2001/XMLSchema" name="login" style="query" type="xs:string"/>
                        <param xmlns:xs="http://www.w3.org/2001/XMLSchema" name="password" style="query" type="xs:string"/>
                    </request>
                    <response>
                        <representation mediaType="text/plain"/>
                    </response>
                </method>
            </resource>
            <resource path="/logout">
                <method id="logout" name="POST"/>
            </resource>
        </resource>
        <resource path="/person">
            <resource path="/user/{id}">
                <param xmlns:xs="http://www.w3.org/2001/XMLSchema" name="id" style="template" type="xs:number"/>
                <method id="getPerson" name="GET">
                    <response>
                        <ns2:representation xmlns:ns2="http://wadl.dev.java.net/2009/02" xmlns="" element="person" mediaType="application/json"/>
                    </response>
                </method>
            </resource>
            <resource path="/user">
                <method id="createPerson" name="POST">
                    <request>
                        <ns2:representation xmlns:ns2="http://wadl.dev.java.net/2009/02" xmlns="" element="person" mediaType="application/json"/>
                    </request>
                </method>
            </resource>
        </resource>
    </resources>
</application>
```

WADL file include schema `<include href="app.xsd"/>` with request and response types, here is `app.xsd`:
```xml
<?xml version="1.0" standalone="yes"?>
<xs:schema version="1.0" xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xs:element name="person" type="person"/>
    <xs:complexType name="person">
        <xs:sequence>
            <xs:element name="id" type="xs:number"/>
            <xs:element name="firstName" type="xs:string"/>
            <xs:element name="lastName" type="xs:string"/>
            <xs:element name="birthDate" type="xs:date"/>
        </xs:sequence>
    </xs:complexType>
</xs:schema>
```

For example, you have TypeScript project with Angular2, to generate client run:

```bash
rest-client-generator --output-file services.ts --platform angular2-ts app.wadl
```

### From Swagger

If you don't have WADL schema, you can generate client from Swagger YAML or JSON.
Alternative of upper mentioned WADL schema in Swagger is `app.yaml`:
```yaml
swagger: '2.0'
info:
  version: v1
  title: Test API
host: 'localhost:8080'
basePath: /restapi
schemes:
  - http
tags:
  - name: auth
  - name: person
paths:
  /auth/login:
    post:
      tags:
        - auth
      summary: ''
      description: ''
      operationId: login
      produces:
        - text/plain
      parameters:
        - name: login
          in: query
          required: true
          type: string
        - name: password
          in: query
          required: true
          type: string
      responses:
        '200':
          description: OK
  /auth/logout:
    post:
      tags:
        - auth
      summary: ''
      description: ''
      operationId: logout
      responses:
        '200':
          description: OK
  /person/user/{id}:
    get:
      tags:
        - person
      summary: ''
      description: ''
      operationId: getPerson
      produces:
        - application/json
      parameters:
        - name: id
          in: path
          required: true
          type: integer
          format: int34
      responses:
        '200':
          description: OK
          schema:
            $ref: '#/definitions/Person'
  /person/user:
    post:
      tags:
        - person
      summary: ''
      description: ''
      operationId: createPerson
      consumes:
        - application/json
      parameters:
        - name: body
          in: body
          required: true
          schema:
            $ref: '#/definitions/Person'
      responses:
        '200':
          description: OK
definitions:
  Person:
    type: object
    required:
      - id
      - firstName
      - lastName
      - birthDate
    properties:
      id:
        type: integer
        format: int32
      firstName:
        type: string
      lastName:
        type: string
      birthDate:
        type: string
        format: date
```
To to generate client run command:

```bash
rest-client-generator --output-file services.ts --platform angular2-ts app.yaml
```

### Generated client

Lets watch your generated rest client `services.ts`
```ts
import ...

export const SERVICE_ROOT_URL = new InjectionToken<string>('service-root-url');
export const SERVICE_JSON_DATE_PATTERN = new InjectionToken<string>('service-json-date-pattern');
...
export interface Person {
    id: number;
    firstName: string;
    lastName: string;
    birthDate: Date;
}

@Injectable()
export class AuthService {
    constructor...
    public login(login: string, password: string): Observable<string> {
        ...
    }
    public logout(): Observable<void> {
        ...
    }
}

@Injectable()
export class PersonService {
    constructor...
    public getPerson(id: number): Observable<Person> {
        ...
    }
    public createPerson(_request: Person): Observable<string> {
        ...
    }
}

@NgModule({
    ...
    providers: [
        { provide: SERVICE_ROOT_URL, ... },
        { provide: SERVICE_JSON_DATE_PATTERN, ... },
        ...
        AuthService,
        PersonService
    ]
})
export class ServiceModule {
}
```
In your app you can change url of your REST api, with provide constant `SERVICE_ROOT_URL`:
```ts
bootstrap(AppComponent,[provide(SERVICE_ROOT_URL, { useValue='http://yourapp.com:80/restapi/' })]);
```

In JSON date types has string representation (ISO 8601). TypeScript is not able to recognize it and convert to Date object. Constant `SERVICE_JSON_DATE_PATTERN` is regular expression, which test all received strings, if they matched is converted to Date object.

Interface `Person` is type from schema `app.xsd`. Services `AuthService` and `PersonService` are resources from WADL `app.wadl` with they methods. HTTP call are asynchronous, so methods return `Observable`.


## Usage

You have generated rest client in `services.ts`, first you must import service module to your application module.

```ts
import ...
import { ServiceModule } from './services';

@NgModule({
    imports: [
        ...
        ServiceModule
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
```

Now, you can enjoy your client :-)
```ts
import ...
import { AuthService } from './services';

@Component(...)
export class LoginComponent {
    private model: any = {};
    constructor(private authService: AuthService) {
    }
    login() {
        this.authService.login(this.model.username, this.model.password)
            .subscribe((token: string) => {
                console.log('successfully logged in, token: %s', token);
            }, (error: Error) => {
                console.error(error);
            });
    },
    logout() {
        this.authService.logout().subscribe();
    }
}
```

```ts
import ...
import { PersonService, Person } from '../services';

@Component(...)
export class PersonComponent {
    constructor(private personService: PersonService) {
    }
    doSomeStuff() {
        let id: number = 1000;
        this.personService.getPerson(id)
            .subscribe((person: Person) => {
                console.log('person with id %d is: %o', id, person);
            });

        let person: Person = {
            id: null,
            firstName: 'Derp',
            lastName: 'Derpington',
            birthdate: new Date('1980-05-08T09:25Z')
        };
        this.personService.createPerson(person)
            .subscribe((id: string) => {
                person.id = parseInt(id);
                console.log('created person: %o', person);
            });
    }
}
```


## License

Apache 2.0
