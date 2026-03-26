# TypeScript / Node.js — Clean Architecture Reference

## 1. Folder Structure

```
src/
├── domain/
│   ├── entities/
│   │   └── User.ts            # Entity with factory method
│   ├── value-objects/
│   │   └── Email.ts           # Immutable, validated
│   ├── events/
│   │   └── UserCreatedEvent.ts
│   ├── repositories/
│   │   └── IUserRepository.ts # Port (interface only)
│   └── errors/
│       └── DomainErrors.ts
├── application/
│   ├── use-cases/
│   │   └── CreateUserUseCase.ts
│   ├── ports/
│   │   └── IEmailService.ts
│   └── dtos/
│       └── UserDto.ts
├── infrastructure/
│   ├── persistence/
│   │   └── PrismaUserRepository.ts
│   └── services/
│       └── NodemailerEmailService.ts
├── api/
│   └── routes/
│       └── userRoutes.ts
└── container.ts               # DI wiring
```

---

## 2. Domain Entity — User

```typescript
// domain/entities/User.ts
import { randomUUID } from "crypto";
import { Email } from "../value-objects/Email";
import { UserCreatedEvent } from "../events/UserCreatedEvent";
import type { DomainEvent } from "../events/DomainEvent";

export class User {
  private readonly _domainEvents: DomainEvent[] = [];

  readonly id: string;
  readonly email: Email;
  readonly name: string;
  isActive: boolean;
  readonly createdAt: Date;

  private constructor(params: {
    id: string;
    email: Email;
    name: string;
    isActive: boolean;
    createdAt: Date;
  }) {
    this.id = params.id;
    this.email = params.email;
    this.name = params.name;
    this.isActive = params.isActive;
    this.createdAt = params.createdAt;
  }

  /** Factory method — the only way to create a valid User */
  static create(rawEmail: string, name: string): User {
    if (!name?.trim()) throw new Error("Name is required");

    const email = Email.create(rawEmail);
    const user = new User({
      id: randomUUID(),
      email,
      name: name.trim(),
      isActive: true,
      createdAt: new Date(),
    });

    user._domainEvents.push(new UserCreatedEvent(user.id, email.value));
    return user;
  }

  deactivate(): void {
    if (!this.isActive) throw new Error("User is already inactive");
    this.isActive = false;
  }

  collectEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents.length = 0;
    return events;
  }
}
```

---

## 3. Value Object — Email

```typescript
// domain/value-objects/Email.ts
export class Email {
  readonly value: string;

  private static readonly REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Email {
    if (!raw?.trim()) throw new Error("Email is required");

    const normalized = raw.trim().toLowerCase();
    if (!Email.REGEX.test(normalized)) {
      throw new Error(`Invalid email format: "${raw}"`);
    }

    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
```

---

## 4. Ports (Interfaces)

```typescript
// domain/repositories/IUserRepository.ts
import type { User } from "../entities/User";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
}

// application/ports/IEmailService.ts
export interface IEmailService {
  sendWelcome(toEmail: string, name: string): Promise<void>;
}
```

---

## 5. Use Case — CreateUserUseCase

```typescript
// application/use-cases/CreateUserUseCase.ts
import { User } from "../../domain/entities/User";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { IEmailService } from "../ports/IEmailService";

export interface CreateUserRequest {
  email: string;
  name: string;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  name: string;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly emailService: IEmailService,
  ) {}

  async execute(request: CreateUserRequest): Promise<CreateUserResponse> {
    const exists = await this.userRepo.existsByEmail(request.email);
    if (exists) {
      throw new Error(`Email already in use: ${request.email}`);
    }

    const user = User.create(request.email, request.name);

    await this.userRepo.save(user);
    await this.emailService.sendWelcome(user.email.value, user.name);

    return { id: user.id, email: user.email.value, name: user.name };
  }
}
```

---

## 6. SOLID in TypeScript

### SRP — Single Responsibility Principle

**❌ Before: one class that does too much**
```typescript
class UserService {
  createUser(email: string, name: string): User { /* ... */ }
  sendWelcomeEmail(user: User): void { /* wrong layer */ }
  exportToCsv(users: User[]): Buffer { /* wrong layer */ }
  generateReport(): UserReport { /* wrong layer */ }
}
```

**✅ After: each class has one reason to change**
```typescript
class CreateUserUseCase {
  execute(request: CreateUserRequest): Promise<User> { /* ... */ }
}

class EmailNotificationService implements IEmailService {
  sendWelcome(toEmail: string, name: string): Promise<void> { /* ... */ }
}

class UserExportService {
  exportToCsv(users: User[]): Buffer { /* ... */ }
}
```

---

### OCP — Open/Closed Principle

**❌ Before: adding a new type forces modifying the function**
```typescript
function calculatePrice(price: number, customerType: string): number {
  if (customerType === "vip") return price * 0.8;
  if (customerType === "member") return price * 0.9;
  return price; // Adding "staff" means editing this function
}
```

**✅ After: extend with new strategies, never touch existing code**
```typescript
interface DiscountStrategy {
  apply(price: number): number;
}

class VipDiscount implements DiscountStrategy {
  apply(price: number): number { return price * 0.8; }
}

class MemberDiscount implements DiscountStrategy {
  apply(price: number): number { return price * 0.9; }
}

class StaffDiscount implements DiscountStrategy { // New type — zero edits elsewhere
  apply(price: number): number { return price * 0.5; }
}

class PriceCalculator {
  constructor(private readonly strategy: DiscountStrategy) {}
  calculate(price: number): number { return this.strategy.apply(price); }
}
```

---

### LSP — Liskov Substitution Principle

**❌ Before: subclass breaks caller assumptions**
```typescript
class Rectangle {
  constructor(public width: number, public height: number) {}
  area(): number { return this.width * this.height; }
}

class Square extends Rectangle {
  set width(v: number) { super.width = v; super.height = v; } // Surprises callers
  set height(v: number) { super.width = v; super.height = v; }
}
// r.width = 4; r.height = 5; assert(r.area() === 20) — fails for Square
```

**✅ After: model the domain correctly**
```typescript
interface Shape {
  area(): number;
}

class Rectangle implements Shape {
  constructor(readonly width: number, readonly height: number) {}
  area(): number { return this.width * this.height; }
}

class Square implements Shape {
  constructor(readonly side: number) {}
  area(): number { return this.side ** 2; }
}
```

---

### ISP — Interface Segregation Principle

**❌ Before: fat interface forces stubs**
```typescript
interface INotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSms(to: string, text: string): Promise<void>;
  sendPush(deviceToken: string, title: string): Promise<void>;
  // Email-only implementors must stub sendSms and sendPush
}
```

**✅ After: small, focused interfaces**
```typescript
interface IEmailNotifier {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

interface ISmsNotifier {
  sendSms(to: string, text: string): Promise<void>;
}

interface IPushNotifier {
  sendPush(deviceToken: string, title: string): Promise<void>;
}

// Compose only what you need
class WelcomeEmailHandler {
  constructor(private readonly notifier: IEmailNotifier) {}
}
```

---

### DIP — Dependency Inversion Principle

**❌ Before: use case imports a concrete class**
```typescript
import { PrismaUserRepository } from "../../infrastructure/persistence/PrismaUserRepository";

class CreateUserUseCase {
  private repo = new PrismaUserRepository(); // Hard-wired — untestable
}
```

**✅ After: depend on the interface, inject the implementation**
```typescript
import type { IUserRepository } from "../../domain/repositories/IUserRepository";

class CreateUserUseCase {
  constructor(private readonly repo: IUserRepository) {}
  // Swap PrismaUserRepository for InMemoryUserRepository in tests
}
```

---

## 7. Dependency Injection Container

### Manual Wiring

```typescript
// container.ts
import { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "./infrastructure/persistence/PrismaUserRepository";
import { NodemailerEmailService } from "./infrastructure/services/NodemailerEmailService";
import { CreateUserUseCase } from "./application/use-cases/CreateUserUseCase";

const prisma = new PrismaClient();

export const userRepository = new PrismaUserRepository(prisma);
export const emailService = new NodemailerEmailService();
export const createUserUseCase = new CreateUserUseCase(userRepository, emailService);
```

### Using tsyringe

```typescript
// Decorate abstractions
import "reflect-metadata";
import { container, injectable, inject } from "tsyringe";
import type { IUserRepository } from "./domain/repositories/IUserRepository";

const TOKENS = {
  IUserRepository: Symbol("IUserRepository"),
  IEmailService: Symbol("IEmailService"),
} as const;

@injectable()
class CreateUserUseCase {
  constructor(
    @inject(TOKENS.IUserRepository) private readonly userRepo: IUserRepository,
    @inject(TOKENS.IEmailService) private readonly emailService: IEmailService,
  ) {}
}

// Bootstrap — wire once
container.registerSingleton<IUserRepository>(
  TOKENS.IUserRepository,
  PrismaUserRepository,
);
container.registerSingleton<IEmailService>(
  TOKENS.IEmailService,
  NodemailerEmailService,
);

// Resolve
const useCase = container.resolve(CreateUserUseCase);
```

---

## 8. Domain Events

```typescript
// domain/events/DomainEvent.ts
export interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
}

// domain/events/UserCreatedEvent.ts
import { randomUUID } from "crypto";
import type { DomainEvent } from "./DomainEvent";

export class UserCreatedEvent implements DomainEvent {
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();

  constructor(
    readonly userId: string,
    readonly email: string,
  ) {}
}
```

### Event Dispatcher (Application layer)

```typescript
// application/ports/IEventDispatcher.ts
import type { DomainEvent } from "../../domain/events/DomainEvent";

export interface IEventDispatcher {
  dispatch(events: DomainEvent[]): Promise<void>;
}

// application/use-cases/CreateUserUseCase.ts (with events)
export class CreateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly emailService: IEmailService,
    private readonly eventDispatcher: IEventDispatcher,
  ) {}

  async execute(request: CreateUserRequest): Promise<CreateUserResponse> {
    const user = User.create(request.email, request.name);

    await this.userRepo.save(user);
    await this.emailService.sendWelcome(user.email.value, user.name);

    const events = user.collectEvents();
    await this.eventDispatcher.dispatch(events);

    return { id: user.id, email: user.email.value, name: user.name };
  }
}
```
