# Skill: Code Architecture Standards

Este documento es la referencia maestra de estándares de arquitectura de software para el plugin team-software-engineering. Cubre los patrones, principios y decisiones que un agente debe conocer y aplicar.

---

## 1. Clean Architecture (Robert C. Martin)

### Regla fundamental
Las dependencias solo pueden apuntar hacia adentro. Una capa interior NUNCA importa nada de una capa exterior.

```
[Frameworks & Drivers] → [Interface Adapters] → [Use Cases] → [Entities]
```

### Capas y responsabilidades

| Capa | Qué contiene | Puede importar de |
|------|--------------|-------------------|
| Entities | Reglas de negocio empresarial, lógica de dominio pura | Nadie |
| Use Cases | Orquestación de casos de uso, lógica de aplicación | Entities |
| Interface Adapters | Controllers, Presenters, Gateways, Repositorios | Use Cases, Entities |
| Frameworks & Drivers | FastAPI, SQLAlchemy, React, bases de datos, UI | Todo |

### Estructura de carpetas — FastAPI/Python

```
src/
├── domain/                    # Entities — capa más interna
│   ├── entities/
│   │   ├── user.py            # Clase pura, sin imports externos
│   │   └── order.py
│   ├── value_objects/
│   │   ├── email.py
│   │   └── money.py
│   ├── repositories/          # Interfaces (ABC) — no implementaciones
│   │   ├── user_repository.py
│   │   └── order_repository.py
│   └── exceptions.py          # Excepciones de dominio
│
├── application/               # Use Cases
│   ├── use_cases/
│   │   ├── create_user.py
│   │   ├── get_user.py
│   │   └── place_order.py
│   ├── dtos/                  # Data Transfer Objects
│   │   ├── user_dto.py
│   │   └── order_dto.py
│   └── ports/                 # Interfaces de servicios externos
│       ├── email_service.py
│       └── payment_gateway.py
│
├── infrastructure/            # Interface Adapters + Frameworks
│   ├── database/
│   │   ├── models/            # SQLAlchemy models
│   │   │   └── user_model.py
│   │   └── repositories/      # Implementaciones concretas
│   │       └── sql_user_repository.py
│   ├── external/              # Clientes HTTP, colas, etc.
│   │   ├── stripe_payment.py
│   │   └── sendgrid_email.py
│   └── api/
│       ├── routers/           # FastAPI routers
│       │   ├── users.py
│       │   └── orders.py
│       ├── schemas/           # Pydantic request/response schemas
│       │   └── user_schemas.py
│       └── dependencies.py    # FastAPI Depends() setup
│
├── config/
│   ├── settings.py
│   └── container.py           # Dependency injection
│
└── main.py                    # FastAPI app setup
```

### Estructura de carpetas — TypeScript/React

```
src/
├── domain/                    # Entities
│   ├── entities/
│   │   ├── User.ts
│   │   └── Order.ts
│   ├── value-objects/
│   │   └── Email.ts
│   └── interfaces/
│       ├── IUserRepository.ts
│       └── IOrderRepository.ts
│
├── application/               # Use Cases
│   ├── use-cases/
│   │   ├── CreateUser.ts
│   │   └── GetUserById.ts
│   └── dtos/
│       └── UserDTO.ts
│
├── infrastructure/            # Adapters + Frameworks
│   ├── api/
│   │   └── UserApiRepository.ts
│   ├── http/
│   │   └── httpClient.ts
│   └── store/
│       └── userStore.ts
│
├── presentation/              # React components, pages, hooks
│   ├── components/
│   ├── pages/
│   └── hooks/
│
└── config/
    └── container.ts
```

### Ejemplo de la regla de dependencia — Python

```python
# domain/entities/user.py — CORRECTO: sin imports externos
from dataclasses import dataclass
from uuid import UUID

@dataclass
class User:
    id: UUID
    name: str
    email: str

    def change_email(self, new_email: str) -> None:
        if "@" not in new_email:
            raise ValueError(f"Invalid email: {new_email}")
        self.email = new_email


# domain/repositories/user_repository.py — interfaz, no implementación
from abc import ABC, abstractmethod
from uuid import UUID
from domain.entities.user import User

class IUserRepository(ABC):
    @abstractmethod
    async def find_by_id(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def save(self, user: User) -> None: ...


# application/use_cases/create_user.py — orquesta sin saber del framework
from uuid import uuid4
from domain.entities.user import User
from domain.repositories.user_repository import IUserRepository
from application.dtos.user_dto import CreateUserDTO, UserResponseDTO

class CreateUserUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, dto: CreateUserDTO) -> UserResponseDTO:
        existing = await self._user_repo.find_by_email(dto.email)
        if existing:
            raise ValueError("Email already registered")

        user = User(id=uuid4(), name=dto.name, email=dto.email)
        await self._user_repo.save(user)
        return UserResponseDTO(id=user.id, name=user.name, email=user.email)


# infrastructure/api/routers/users.py — framework al exterior
from fastapi import APIRouter, Depends, HTTPException
from application.use_cases.create_user import CreateUserUseCase
from infrastructure.api.schemas.user_schemas import CreateUserRequest, UserResponse
from infrastructure.api.dependencies import get_create_user_use_case

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    request: CreateUserRequest,
    use_case: CreateUserUseCase = Depends(get_create_user_use_case),
) -> UserResponse:
    try:
        result = await use_case.execute(request.to_dto())
        return UserResponse.from_dto(result)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
```

### Errores comunes

| Error | Correcto |
|-------|---------|
| Importar SQLAlchemy en domain/entities | Entidades son clases Python puras |
| Lógica de negocio en el router/controller | Delegar al Use Case |
| Use Case conoce FastAPI o HTTPException | Usar excepciones de dominio propias |
| Repository concreto en Application layer | Solo interfaces (ABC) en Application |
| Schemas de Pydantic como entidades de dominio | Schemas solo en capa de Infrastructure |

### Conexión con SOLID
- **SRP**: cada capa tiene una única razón para cambiar
- **OCP**: nuevos casos de uso no modifican entidades
- **DIP**: las capas internas dependen de abstracciones, no de implementaciones

### Checklist de enforcement
- [ ] Ninguna entidad importa de `infrastructure` o `application`
- [ ] Cada Use Case recibe sus dependencias por inyección (no `new` internamente)
- [ ] Los routers/controllers no contienen lógica de negocio
- [ ] Los repository interfaces viven en `domain`, las implementaciones en `infrastructure`
- [ ] Los errores que cruzan capas son excepciones de dominio, no HTTPException

---

## 2. SOLID Principles

### S — Single Responsibility Principle

Una clase o función debe tener una única razón para cambiar.

**Antes (violación):**
```python
# Un solo módulo hace demasiado
class UserService:
    def create_user(self, data: dict) -> User:
        # validación
        if not data.get("email") or "@" not in data["email"]:
            raise ValueError("Invalid email")
        # persistencia
        user = User(**data)
        db.session.add(user)
        db.session.commit()
        # notificación
        requests.post("https://smtp-provider.com/send", json={
            "to": data["email"],
            "subject": "Welcome!"
        })
        return user
```

**Después (correcto):**
```python
# Cada clase tiene UNA responsabilidad
class UserValidator:
    def validate(self, data: dict) -> None:
        if not data.get("email") or "@" not in data["email"]:
            raise ValueError("Invalid email")

class UserRepository:
    def save(self, user: User) -> None:
        db.session.add(user)
        db.session.commit()

class EmailNotifier:
    def send_welcome(self, email: str) -> None:
        requests.post("https://smtp-provider.com/send", json={
            "to": email, "subject": "Welcome!"
        })

class CreateUserUseCase:
    def __init__(
        self,
        validator: UserValidator,
        repo: UserRepository,
        notifier: EmailNotifier,
    ) -> None:
        self._validator = validator
        self._repo = repo
        self._notifier = notifier

    def execute(self, data: dict) -> User:
        self._validator.validate(data)
        user = User(**data)
        self._repo.save(user)
        self._notifier.send_welcome(data["email"])
        return user
```

**TypeScript:**
```typescript
// Antes: una clase hace todo
class UserManager {
  createUser(data: CreateUserData): User {
    // validación + persistencia + notificación mezcladas
  }
}

// Después: responsabilidades separadas
class UserValidator {
  validate(data: CreateUserData): void { /* solo validación */ }
}

class UserRepository {
  save(user: User): Promise<void> { /* solo persistencia */ }
}

class EmailService {
  sendWelcome(email: string): Promise<void> { /* solo email */ }
}
```

---

### O — Open/Closed Principle

Abierto para extensión, cerrado para modificación.

**Antes (violación):**
```python
# Agregar un nuevo método de pago requiere modificar esta clase
class PaymentProcessor:
    def process(self, method: str, amount: float) -> None:
        if method == "stripe":
            stripe_sdk.charge(amount)
        elif method == "paypal":
            paypal_sdk.payment(amount)
        # Cada nuevo método requiere modificar aquí
```

**Después (correcto):**
```python
from abc import ABC, abstractmethod

class PaymentGateway(ABC):
    @abstractmethod
    def process(self, amount: float) -> None: ...

class StripeGateway(PaymentGateway):
    def process(self, amount: float) -> None:
        stripe_sdk.charge(amount)

class PaypalGateway(PaymentGateway):
    def process(self, amount: float) -> None:
        paypal_sdk.payment(amount)

# Para agregar MercadoPago: solo crear MercadoPagoGateway
# PaymentProcessor no se toca
class PaymentProcessor:
    def __init__(self, gateway: PaymentGateway) -> None:
        self._gateway = gateway

    def process(self, amount: float) -> None:
        self._gateway.process(amount)
```

**TypeScript:**
```typescript
interface PaymentGateway {
  process(amount: number): Promise<void>
}

class StripeGateway implements PaymentGateway {
  async process(amount: number): Promise<void> { /* Stripe SDK */ }
}

class PaypalGateway implements PaymentGateway {
  async process(amount: number): Promise<void> { /* PayPal SDK */ }
}

// Agregar MercadoPago: solo crear nueva clase, sin tocar PaymentProcessor
class PaymentProcessor {
  constructor(private gateway: PaymentGateway) {}
  async process(amount: number): Promise<void> {
    await this.gateway.process(amount)
  }
}
```

---

### L — Liskov Substitution Principle

Los subtipos deben ser sustituibles por sus tipos base sin alterar el comportamiento del programa.

**Violación clásica:**
```python
class Rectangle:
    def set_width(self, w: int) -> None: self.width = w
    def set_height(self, h: int) -> None: self.height = h
    def area(self) -> int: return self.width * self.height

class Square(Rectangle):
    # VIOLACION: Square no puede ser sustituido por Rectangle
    def set_width(self, w: int) -> None:
        self.width = w
        self.height = w  # Side effect inesperado

def print_area(rect: Rectangle) -> None:
    rect.set_width(5)
    rect.set_height(10)
    assert rect.area() == 50  # Falla con Square
```

**Correcto:**
```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> int: ...

class Rectangle(Shape):
    def __init__(self, width: int, height: int) -> None:
        self.width = width
        self.height = height
    def area(self) -> int: return self.width * self.height

class Square(Shape):
    def __init__(self, side: int) -> None:
        self.side = side
    def area(self) -> int: return self.side ** 2
```

**TypeScript — ejemplo práctico con servicios:**
```typescript
interface IEmailService {
  sendMail(email: Mail): Promise<TransmissionResult>
}

class SendGridService implements IEmailService {
  async sendMail(email: Mail): Promise<TransmissionResult> { /* ... */ }
}

class MailgunService implements IEmailService {
  async sendMail(email: Mail): Promise<TransmissionResult> { /* ... */ }
}

// Ambas implementaciones son intercambiables — LSP cumplido
const controller = new UserController(new SendGridService())
const controller2 = new UserController(new MailgunService())
```

---

### I — Interface Segregation Principle

Los clientes no deben depender de interfaces que no usan.

**Antes (violación):**
```python
from abc import ABC, abstractmethod

class IWorker(ABC):
    @abstractmethod
    def work(self) -> None: ...
    @abstractmethod
    def eat(self) -> None: ...  # Los robots no comen

class Robot(IWorker):
    def work(self) -> None: print("working")
    def eat(self) -> None: raise NotImplementedError("Robots don't eat")
```

**Después (correcto):**
```python
class IWorkable(ABC):
    @abstractmethod
    def work(self) -> None: ...

class IFeedable(ABC):
    @abstractmethod
    def eat(self) -> None: ...

class Human(IWorkable, IFeedable):
    def work(self) -> None: print("working")
    def eat(self) -> None: print("eating")

class Robot(IWorkable):
    def work(self) -> None: print("working")
```

**TypeScript:**
```typescript
// Antes: interfaz monolítica
interface IWorker {
  work(): void
  eat(): void      // Robots no comen
  sleep(): void    // Robots no duermen
}

// Después: interfaces segregadas
interface IWorkable { work(): void }
interface IFeedable { eat(): void }
interface ISleepable { sleep(): void }

class Human implements IWorkable, IFeedable, ISleepable {
  work(): void { /* ... */ }
  eat(): void { /* ... */ }
  sleep(): void { /* ... */ }
}

class Robot implements IWorkable {
  work(): void { /* ... */ }
}
```

---

### D — Dependency Inversion Principle

Las abstracciones no deben depender de detalles. Los detalles deben depender de abstracciones.

**Antes (violación):**
```python
class CreateOrderUseCase:
    def __init__(self) -> None:
        # Acoplado a implementación concreta — no se puede testear ni cambiar
        self._repo = PostgresOrderRepository()
        self._notifier = SendGridEmailService()

    def execute(self, order_data: dict) -> Order: ...
```

**Después (correcto):**
```python
from domain.repositories.order_repository import IOrderRepository
from application.ports.email_service import IEmailService

class CreateOrderUseCase:
    def __init__(
        self,
        repo: IOrderRepository,      # Interfaz, no implementación
        notifier: IEmailService,     # Interfaz, no implementación
    ) -> None:
        self._repo = repo
        self._notifier = notifier

    async def execute(self, order_data: CreateOrderDTO) -> OrderDTO:
        order = Order.create(order_data)
        await self._repo.save(order)
        await self._notifier.send_order_confirmation(order)
        return OrderDTO.from_entity(order)
```

**TypeScript:**
```typescript
// Antes: acoplamiento a implementación concreta
class CreateUserController extends BaseController {
  private emailService = new SendGridService()  // imposible de mockear
}

// Después: inyección de dependencias
interface IEmailService {
  sendMail(email: Mail): Promise<Result>
}

class CreateUserController extends BaseController {
  constructor(private emailService: IEmailService) {
    super()
  }
  protected async executeImpl(): Promise<void> {
    const mail = new Mail(/* ... */)
    await this.emailService.sendMail(mail)
  }
}

// Tests: inyectar mock
const mockEmail: IEmailService = { sendMail: jest.fn() }
const controller = new CreateUserController(mockEmail)
```

---

## 3. DRY, KISS, YAGNI

### DRY — Don't Repeat Yourself

**Violación:**
```python
# Cálculo de tax duplicado en 3 lugares
def calculate_book_price(price: float) -> float:
    return price + price * 0.10  # 10% tax

def calculate_electronics_price(price: float) -> float:
    return price + price * 0.10  # mismo cálculo

def calculate_clothing_price(price: float) -> float:
    return price + price * 0.10  # duplicado otra vez
```

**Correcto:**
```python
TAX_RATE = 0.10

def apply_tax(price: float, rate: float = TAX_RATE) -> float:
    return price + price * rate

# Uso consistente
book_price = apply_tax(29.99)
electronics_price = apply_tax(499.99)
```

**Cuando NO aplicar DRY — la abstraccion incorrecta es peor que la duplicacion:**
```python
# Dos funciones que parecen iguales pero tienen razones DISTINTAS para cambiar
def calculate_employee_bonus(salary: float) -> float:
    return salary * 0.10  # Regla de RRHH

def calculate_referral_commission(sale_amount: float) -> float:
    return sale_amount * 0.10  # Regla de Ventas

# NO juntar en una sola función aunque hagan lo mismo hoy.
# Si cambias la comisión de referidos, no debes afectar el bonus de empleados.
# La duplicación aquí es intencional y correcta.
```

### KISS — Keep It Simple, Stupid

**Violación:**
```python
# Overcomplicated para leer un archivo de configuración
class ConfigurationManagerFactory:
    @classmethod
    def create_instance(cls, strategy: str = "default") -> "ConfigurationManager":
        strategies = {"default": DefaultConfigStrategy, "env": EnvConfigStrategy}
        return ConfigurationManager(strategies[strategy]())

# Correcto para el 90% de los casos:
import os
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/mydb")
```

**TypeScript:**
```typescript
// Violación: cadena de métodos de utilidades inventadas
const result = ArrayUtils.mapAndFilter(
  CollectionHelper.fromIterable(data),
  TransformPipeline.create().add(x => x * 2).build()
)

// Correcto:
const result = data.filter(x => x > 0).map(x => x * 2)
```

### YAGNI — You Ain't Gonna Need It

**Violación:**
```python
class User:
    def __init__(self, name: str, email: str) -> None:
        self.name = name
        self.email = email
        # YAGNI violations: nadie pidió estos campos todavía
        self.phone: str | None = None
        self.secondary_email: str | None = None
        self.linkedin_url: str | None = None
        self.preferred_language: str = "en"
        self.timezone: str = "UTC"

    # Método que nadie pidió para el sprint actual
    def export_to_csv(self) -> str: ...
    def sync_with_crm(self) -> None: ...
```

**Correcto:**
```python
class User:
    def __init__(self, name: str, email: str) -> None:
        self.name = name
        self.email = email
    # Agregar campos y métodos cuando los requiera un caso de uso real
```

---

## 4. Domain-Driven Design (DDD)

### Conceptos clave

**Entity** — objeto con identidad única que persiste en el tiempo:
```python
from dataclasses import dataclass, field
from uuid import UUID, uuid4

@dataclass
class Order:
    id: UUID = field(default_factory=uuid4)
    customer_id: UUID = field(...)
    items: list["OrderItem"] = field(default_factory=list)
    status: "OrderStatus" = field(default="pending")

    def add_item(self, item: "OrderItem") -> None:
        if self.status != "pending":
            raise ValueError("Cannot modify a confirmed order")
        self.items.append(item)

    def confirm(self) -> "OrderConfirmed":
        if not self.items:
            raise ValueError("Cannot confirm empty order")
        self.status = "confirmed"
        return OrderConfirmed(order_id=self.id)  # Domain Event
```

**Value Object** — inmutable, identificado por valor, no por identidad:
```python
from dataclasses import dataclass

@dataclass(frozen=True)  # frozen=True lo hace inmutable
class Money:
    amount: float
    currency: str

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")
        if len(self.currency) != 3:
            raise ValueError("Currency must be a 3-letter ISO code")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(amount=self.amount + other.amount, currency=self.currency)

@dataclass(frozen=True)
class Email:
    value: str

    def __post_init__(self) -> None:
        if "@" not in self.value:
            raise ValueError(f"Invalid email: {self.value}")
```

**Aggregate** — grupo de entidades y value objects con un Aggregate Root:
```python
# Order es el Aggregate Root — el único punto de entrada al aggregate
@dataclass
class Order:  # Aggregate Root
    id: UUID
    customer_id: UUID
    shipping_address: Address  # Value Object
    items: list[OrderItem]     # Entidades internas
    total: Money               # Value Object

    # Toda mutación del aggregate pasa por aquí
    def add_item(self, product_id: UUID, quantity: int, price: Money) -> None:
        item = OrderItem(product_id=product_id, quantity=quantity, price=price)
        self.items.append(item)
        self._recalculate_total()

    def _recalculate_total(self) -> None:
        self.total = sum(
            (item.price for item in self.items),
            start=Money(0, self.total.currency)
        )
```

**Repository** — abstracción de la persistencia:
```python
from abc import ABC, abstractmethod

class IOrderRepository(ABC):
    @abstractmethod
    async def find_by_id(self, order_id: UUID) -> Order | None: ...

    @abstractmethod
    async def find_by_customer(self, customer_id: UUID) -> list[Order]: ...

    @abstractmethod
    async def save(self, order: Order) -> None: ...

    @abstractmethod
    async def delete(self, order_id: UUID) -> None: ...

# Implementación en infrastructure/
class SQLAlchemyOrderRepository(IOrderRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, order_id: UUID) -> Order | None:
        model = await self._session.get(OrderModel, order_id)
        return model.to_domain() if model else None

    async def save(self, order: Order) -> None:
        model = OrderModel.from_domain(order)
        await self._session.merge(model)
```

**Domain Events** — cosas que ocurrieron en el dominio:
```python
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

@dataclass(frozen=True)
class DomainEvent:
    occurred_at: datetime = field(default_factory=datetime.utcnow)

@dataclass(frozen=True)
class OrderConfirmed(DomainEvent):
    order_id: UUID
    customer_id: UUID
    total_amount: float

@dataclass(frozen=True)
class UserRegistered(DomainEvent):
    user_id: UUID
    email: str

# En el Use Case: publicar eventos después de persistir
class ConfirmOrderUseCase:
    async def execute(self, order_id: UUID) -> None:
        order = await self._repo.find_by_id(order_id)
        event = order.confirm()             # Domain raises event
        await self._repo.save(order)
        await self._event_bus.publish(event) # Publicar después de guardar
```

**Bounded Contexts** — límites explícitos dentro del sistema:
```
ecommerce-system/
├── catalog/           # BC: gestión de productos, precios, stock
│   ├── domain/
│   ├── application/
│   └── infrastructure/
│
├── orders/            # BC: proceso de compra, estados de orden
│   ├── domain/
│   ├── application/
│   └── infrastructure/
│
├── shipping/          # BC: logística, tracking, entregas
│   ├── domain/
│   ├── application/
│   └── infrastructure/
│
└── notifications/     # BC: emails, SMS, push — solo notifica
    ├── domain/
    ├── application/
    └── infrastructure/
```

Cada BC tiene su propio modelo de `Product`. En `catalog` es el modelo completo. En `orders` solo tiene `product_id`, `name`, `price`. No se comparte el modelo entre BCs — se usa Context Mapping.

### DDD + Clean Architecture
- **Entities** de Clean Architecture = Entities + Value Objects + Aggregates de DDD
- **Use Cases** de Clean Architecture = Application Services de DDD
- **Interface Adapters** = Repositories (implementaciones), API controllers
- **Frameworks & Drivers** = ORM, HTTP framework, message broker

---

## 5. Hexagonal Architecture (Ports & Adapters)

### Diferencia con Clean Architecture

| Aspecto | Clean Architecture | Hexagonal Architecture |
|---------|-------------------|----------------------|
| Nomenclatura | Entities, Use Cases, Interface Adapters, Frameworks | Domain, Ports, Adapters |
| Énfasis | Capas concéntricas con regla de dependencia | Simetría: múltiples entradas Y salidas |
| Estructura | Más prescriptiva en capas | Más flexible, enfocada en puertos |
| Testing | Igual de testeable | Igual de testeable |

Conceptualmente son la misma idea. Hexagonal usa vocabulario de "puertos" e "intercambiabilidad".

### Estructura

```
order-service/
├── domain/              # Núcleo de negocio — sin dependencias externas
│   ├── models/
│   │   └── order.py    # Entidad pura
│   └── services/
│       └── order_service.py
│
├── ports/              # Interfaces: contratos entre dominio y exterior
│   ├── input/          # Puertos de entrada (casos de uso)
│   │   └── order_use_cases.py   # ICreateOrder, IGetOrder
│   └── output/         # Puertos de salida (repos, servicios externos)
│       ├── order_repository.py   # IOrderRepository
│       └── payment_port.py       # IPaymentGateway
│
├── adapters/           # Implementaciones concretas de puertos
│   ├── input/
│   │   ├── rest/       # Adaptador HTTP (FastAPI router)
│   │   │   └── order_router.py
│   │   └── cli/        # Adaptador CLI
│   │       └── order_cli.py
│   └── output/
│       ├── postgres/   # Adaptador de BD
│       │   └── postgres_order_repo.py
│       └── stripe/     # Adaptador de pago
│           └── stripe_gateway.py
│
└── config/
    └── dependency_injection.py
```

### Código ejemplo — dominio sin dependencias

```python
# domain/models/order.py
from dataclasses import dataclass, field
from uuid import UUID, uuid4
from enum import Enum

class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"

@dataclass
class Order:
    id: UUID = field(default_factory=uuid4)
    customer_id: str = ""
    items: list = field(default_factory=list)
    status: OrderStatus = OrderStatus.PENDING

    def confirm(self) -> None:
        if not self.items:
            raise ValueError("Cannot confirm empty order")
        self.status = OrderStatus.CONFIRMED
    # Cero imports de FastAPI, SQLAlchemy, requests — dominio puro
```

### Cuándo usar Hexagonal vs Clean Architecture

**Usar Hexagonal cuando:**
- Múltiples tipos de entrada (REST, gRPC, CLI, message queue)
- Alta probabilidad de cambiar la base de datos o proveedor externo
- Necesitas testear el dominio sin infraestructura

**Usar Clean Architecture cuando:**
- Aplicación típica con una sola entrada HTTP
- Equipo más familiarizado con las 4 capas concéntricas
- DDD pesado donde las capas son más naturales

En la práctica, ambas se implementan casi igual. La diferencia es más de vocabulario que de estructura.

---

## Cómo un agente debe aplicar estos estándares

1. **Al revisar código (review):** Verificar que las capas no violan la regla de dependencia. Rechazar PRs donde un entity importa de infrastructure.
2. **Al generar código nuevo:** Siempre crear entidades como clases puras. Siempre recibir dependencias por inyección, nunca instanciarlas internamente.
3. **Al detectar violaciones SOLID:** Señalar la clase/función específica, nombrar el principio violado, proponer la refactorización concreta.
4. **Al diseñar:** Preguntar primero por el bounded context antes de proponer estructura de carpetas.
5. **Al decidir DRY vs duplicación:** Si dos fragmentos tienen razones distintas para cambiar, mantenerlos separados aunque sean idénticos hoy.
