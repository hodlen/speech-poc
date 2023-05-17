type Unsubscribe = () => void;

export class Pubsub<MessageType> {
  private subscribers: Map<number, (msg: MessageType) => void> = new Map();
  private nextSubscriberId = 0;

  public subscribe(cb: (msg: MessageType) => void): Unsubscribe {
    this.subscribers.set(this.nextSubscriberId++, cb);
    return () => {
      this.subscribers.delete(this.nextSubscriberId);
    };
  }
  publish(msg: MessageType): void {
    this.subscribers.forEach((cb) => cb(msg));
  }
}

export class PubsubStore<T> {
  private pubsub = new Pubsub<T>();
  public get value() {
    return this._value;
  }
  constructor(private _value: T) {}
  public subscribe(cb: (data: T) => void): Unsubscribe {
    return this.pubsub.subscribe(cb);
  }
  public publish(data: T): void {
    this._value = data;
    this.pubsub.publish(data);
  }
}
