import { prisma } from '@repo/db';

export const getGlobalSettings = async () => {
    const settings = await prisma.globalSetting.findMany();
    return settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
    }, {} as Record<string, string>);
};

export const updateGlobalSetting = async (key: string, value: string) => {
    if (key === 'currency') {
        await prisma.priceBook.updateMany({
            data: {
                currencyCode: value,
            },
        });
    }

    return await prisma.globalSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
};

export const getCurrencies = async () => {
    return await prisma.currency.findMany();
}