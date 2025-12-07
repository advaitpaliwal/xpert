export type ResourceType = 'reading' | 'watching' | 'listening' | 'interacting';

export type Resource = {
    id: string;
    type: ResourceType;
    title: string;
    subtitle?: string;
    link?: string;
    image?: string;
    content?: string;
};

export type ExpertiseSection = {
    reading: Resource[];
    watching: Resource[];
    listening: Resource[];
    interacting: Resource[];
};

export type Expertise = {
    id: string;
    title: string;
    description: string;
    imagePrompt: string;
    imageUrl?: string;
    content: ExpertiseSection;
};

export type Profile = {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    bio: string;
    expertises: Expertise[];
};
