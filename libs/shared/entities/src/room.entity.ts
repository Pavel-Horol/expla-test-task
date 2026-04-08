export class Room {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly userIds: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
