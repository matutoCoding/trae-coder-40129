import type { Platform } from '@/types';

export const mockPlatforms: Platform[] = [
  {
    id: 'P001',
    name: '云端一号跳台',
    height: 50,
    difficulty: 'normal',
    jumpDuration: 15,
    openTime: '09:00',
    closeTime: '18:00',
    slotInterval: 30,
    status: 'open',
    description: '标准高度跳台，适合大多数游客体验。专业安全设备，教练全程陪同。',
    maxGroupSize: 4
  },
  {
    id: 'P002',
    name: '勇者挑战台',
    height: 80,
    difficulty: 'hard',
    jumpDuration: 20,
    openTime: '09:00',
    closeTime: '17:30',
    slotInterval: 30,
    status: 'open',
    description: '高空挑战跳台，需要一定的勇气和心理准备。建议有蹦极经验者选择。',
    maxGroupSize: 2
  },
  {
    id: 'P003',
    name: '亲子体验台',
    height: 30,
    difficulty: 'easy',
    jumpDuration: 10,
    openTime: '10:00',
    closeTime: '17:00',
    slotInterval: 20,
    status: 'open',
    description: '低高度体验台，适合亲子游玩和初次体验者。双人同时起跳，安全又刺激。',
    maxGroupSize: 6
  },
  {
    id: 'P004',
    name: '极限挑战台',
    height: 120,
    difficulty: 'extreme',
    jumpDuration: 25,
    openTime: '09:30',
    closeTime: '16:30',
    slotInterval: 45,
    status: 'maintenance',
    description: '超高空挑战台，国内最高蹦极设施之一。仅限身体健康的专业体验者。',
    maxGroupSize: 1
  },
  {
    id: 'P005',
    name: '湖畔观景台',
    height: 60,
    difficulty: 'normal',
    jumpDuration: 15,
    openTime: '08:30',
    closeTime: '18:30',
    slotInterval: 30,
    status: 'open',
    description: '临湖而建的观景跳台，下落过程可欣赏湖光山色，风景极佳。',
    maxGroupSize: 3
  }
];

export default mockPlatforms;
