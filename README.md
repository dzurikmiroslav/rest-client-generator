# rest-client-generator


[![Build Status](https://travis-ci.org/dzurikmiroslav/rest-client-generator.svg?branch=master)](https://travis-ci.org/dzurikmiroslav/rest-client-generator)
[![NPM Version](https://img.shields.io/npm/v/rest-client-generator.svg)](https://www.npmjs.com/package/rest-client-generator)
[![License](http://img.shields.io/npm/l/rest-client-generator.svg)](https://www.npmjs.com/package/rest-client-generator)


Generate REST endpoint client from [WADL](http://www.w3.org/Submission/wadl/) for you project. Useful for typed languages such TypeScript and Dart. Currently support generation for platforms:
- [x] Angular2 TypeScript
- [ ] Angular2 Dart
- [ ] Dojo2 TypeScript

Features: 
- WADL request/response representation `application/json` is handled as interface
- Other mimetypes such as `text/*`, `application/xml`, etc. are handled as strings
- Full suport XSD schema types (`xs:string`, `xs:number`, `xs:boolean`, `xs:datetime`, etc.)
- XSD schema enumeration handled as enum
- XSD schema extension handled as object inheritance


## Instalation

Install globally rest-client-generator

```bash
npm install --global rest-client-generator
```


## Generate

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
            <xs:element name="birthdate" type="xs:date"/>
        </xs:sequence>
    </xs:complexType>
</xs:schema>
```

For example, you have TypeScript project with Angular2, to generate client run:

```bash
rest-client-generator --output-file services.ts --platform angular2-ts app.wadl
```


### Generated client

Lets watch your generated rest client `services.ts`
```ts
import ...

export const SERVICE_ROOT_URL = new OpaqueToken('service-root-url');
export const SERVICE_JSON_DATE_PATTERN = new OpaqueToken('service-json-date-pattern');
...
export interface Person {
    id: number;
    firstName: string;
    lastName: string;
    birthdate: Date;
}

@Injectable()
export class AuthService {
    public login(login: string, password: string): Observable<string> {
        ...
    }
    public logout(): Observable<void> {
        ...
    }
}

@Injectable()
export class PersonService {
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

Interface `Person` is type from schema `app.xsd`. Services `AuthService` and `PersonService` are resources from WADL `app.wadl` with they methods. HTTP call are asynchronous, so mehods return `Observable`.


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
        var id: number = 1000;
        this.personService.getPerson(id)
            .subscribe((person: Person) => {
                console.log('person with id %d is: %o', id, person);
            });

        var person: Person = {
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
