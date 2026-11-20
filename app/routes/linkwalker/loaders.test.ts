import { beforeEach, describe, expect, it, vi } from 'vitest';
import LinkWalkerIntegrationApi from '~/data/LinkWalkerIntegrationApi';
import { loader } from './route';
import { requireUser } from "~/server/auth.server";

vi.mock('~/data/LinkWalkerIntegrationApi');
vi.mock('~/utils/selectedOrganization');
vi.mock("~/server/auth.server", () => ({
    requireUser: vi.fn(),
}));

beforeEach(() => {
    vi.resetAllMocks();

    const organisation = {
        id: "org-1",
        name: "fint-org",
        displayName: "FINT Organisation",
        orgNumber: "123456789",
        primaryAssetId: null,
    };

    vi.mocked(requireUser).mockResolvedValue({
        id: "user-1",
        nin: "123456789",
        name: "Test User",
        firstName: "Test",
        lastName: "User",
        mail: "test@example.test",
        isAdmin: false,
        organisation,
        organisations: [organisation],
    });
});

describe('linkwalker loader', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns summary and selected organization', async () => {
        // vi.mocked(getSelectedOrganization).mockResolvedValue('fint-org');
        vi.mocked(LinkWalkerIntegrationApi.getSummary).mockResolvedValue({
            data: {
                scanCompletedAt: '2024-01-01T10:00:00Z',
                orgId: 'fint-org',
                components: ['comp-a'],
                summary: {
                    totalRecords: 100,
                    totalRefs: 200,
                    brokenLinkCount: 5,
                    integrityPercent: 97.5,
                    byProblemType: {},
                    components: [],
                },
            },
        } as any);

        const request = new Request('http://localhost/linkwalker');
        const response = (await loader({ request } as any)) as Response;
        const data = await response.json();

        // expect(getSelectedOrganization).toHaveBeenCalledWith(request);
        expect(LinkWalkerIntegrationApi.getSummary).toHaveBeenCalledWith('fint-org');
        expect(data.orgName).toBe('fint-org');
        expect(data.summary.scanCompletedAt).toBe('2024-01-01T10:00:00Z');
    });

    it('rethrows when LinkWalkerIntegrationApi.getSummary fails', async () => {
        // vi.mocked(getSelectedOrganization).mockResolvedValue('fint-org');
        vi.mocked(LinkWalkerIntegrationApi.getSummary).mockRejectedValue(new Error('boom'));

        await expect(
            loader({ request: new Request('http://localhost/linkwalker') } as any)
        ).rejects.toThrow('boom');
    });
});
