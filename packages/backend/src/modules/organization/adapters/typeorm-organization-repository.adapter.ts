import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationEntity } from '../../../entities/organization.entity';
import { Organization } from '../domain/organization.domain';
import { OrganizationRepositoryPort } from '../ports/organization-repository.port';

@Injectable()
export class TypeOrmOrganizationRepositoryAdapter implements OrganizationRepositoryPort {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly repo: Repository<OrganizationEntity>,
  ) {}

  async findById(id: string): Promise<Organization | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const entity = await this.repo.findOne({ where: { slug } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByName(name: string): Promise<Organization | null> {
    const entity = await this.repo.findOne({ where: { name } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(): Promise<Organization[]> {
    const entities = await this.repo.find();
    return entities.map((e) => this.toDomain(e));
  }

  async save(org: Organization): Promise<Organization> {
    let entity = await this.repo.findOne({ where: { id: org.id } });

    if (!entity) {
      entity = this.repo.create({
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      });
    } else {
      entity.name = org.name;
      entity.slug = org.slug;
      entity.status = org.status;
      entity.updatedAt = org.updatedAt;
    }

    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(entity: OrganizationEntity): Organization {
    return new Organization(
      entity.id,
      entity.name,
      entity.slug,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
