import client from './client';

export interface Portfolio {
  id: string; slug: string; headline?: string; bio?: string;
  is_public: boolean; linkedin_url?: string; website_url?: string;
  user_name?: string; certificate_count: number;
}

export const getMyPortfolio = () => client.get<Portfolio>('/v1/portfolio/me');
export const updateMyPortfolio = (data: Partial<Portfolio>) => client.patch<Portfolio>('/v1/portfolio/me', data);
export const getPublicPortfolio = (slug: string) => client.get<Portfolio>(`/v1/portfolio/${slug}`);
