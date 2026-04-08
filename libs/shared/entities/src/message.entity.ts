export class Message {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly userId: string,
    public readonly roomId: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
