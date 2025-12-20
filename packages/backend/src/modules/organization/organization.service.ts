import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationEntity } from '../../entities/organization.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly orgRepository: Repository<OrganizationEntity>,
  ) {}

  async create(name: string, slug: string): Promise<OrganizationEntity> {
    const existing = await this.orgRepository.findOne({ where: [{ name }, { slug }] });
    if (existing) {
      throw new ConflictException('Organization name or slug already exists');
    }

    const org = this.orgRepository.create({ name, slug });
    return this.orgRepository.save(org);
  }

  async findAll(): Promise<OrganizationEntity[]> {
    return this.orgRepository.find();
  }

  async findOne(id: string): Promise<OrganizationEntity> {
    const org = await this.orgRepository.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async findBySlug(slug: string): Promise<OrganizationEntity> {
    const org = await this.orgRepository.findOne({ where: { slug } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}
