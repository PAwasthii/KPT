import { Request, Response } from 'express';
import { getGlobalSettings as getGlobalSettingsFromDb, updateGlobalSetting as updateGlobalSettingInDb, getCurrencies as getCurrenciesFromDb } from '../services/settings.service.js';

export const getGlobalSettings = async (req: Request, res: Response) => {
    try {
        const settings = await getGlobalSettingsFromDb();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching global settings'+error });
    }
};

export const updateGlobalSetting = async (req: Request, res: Response) => {
    try {
        const { key, value } = req.body;
        const setting = await updateGlobalSettingInDb(key, value);
        res.json(setting);
    } catch (error) {
        res.status(500).json({ message: 'Error updating global setting'+error });
    }
};

export const getCurrencies = async (req: Request, res: Response) => {
    try {
        const currencies = await getCurrenciesFromDb();
        res.json(currencies);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching currencies'+error });
    }
};
