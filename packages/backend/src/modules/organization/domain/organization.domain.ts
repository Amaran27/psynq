/**
 * Organization Domain Entity (pure TypeScript)
 * No framework imports.
 */
export class Organization {
  constructor(
    public readonly id: string,
    public name: string,
    public slug: string,
    public status: string = 'active',
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  rename(newName: string) {
    if (!newName || newName.trim().length < 2) {
      throw new Error('Organization name must be at least 2 characters');
    }
    this.name = newName.trim();
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: string) {
    this.status = newStatus;
    this.updatedAt = new Date();
  }
}
