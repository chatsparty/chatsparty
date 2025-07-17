export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConnectionNotFoundError extends BaseError {
  constructor(message = 'Connection not found') {
    super(message);
  }
}

export class DuplicateConnectionError extends BaseError {
  constructor(message = 'A connection with this name already exists') {
    super(message);
  }
}

export class ConnectionValidationError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export class AgentNotFoundError extends BaseError {
  constructor(message = 'Agent not found') {
    super(message);
  }
}

export class DuplicateAgentError extends BaseError {
  constructor(message = 'An agent with this name already exists') {
    super(message);
  }
}

export class AgentValidationError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
