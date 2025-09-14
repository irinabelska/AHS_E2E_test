import { allure } from 'allure-playwright';
import { APIResponse, expect } from '@playwright/test';

import { Env, getAdminGqlGatewayUrl, getCurrentEnv } from '@/tests/playwright/framework/Env';
import { UserRole } from '@/tests/playwright/framework/entities/UserRole';
import { InviteUserInput } from '@/tests/playwright/framework/entities/InviteUserInput';
import { forceGetFromMap } from '@/tests/playwright/framework/utils/map.utils';
import { test } from '@/tests/playwright/framework/TestConfig';

test.describe('invite users', () => {
  test.skip(true, 'skipped on purpose so that no-one runs it by mistake');
  interface UserToInvite {
    email: string;
    role: UserRole;
  }

  interface UserConfig {
    customersToAssign: string[];
    buildingsToAssign: string[];
    usersToInvite: UserToInvite[];
  }

  const inviteUsers = `
mutation InviteUsers($users: [InviteUserInput!]!) {
  inviteUsers(users: $users) {
    id
    email
  }
}`;

  const DEV_CUSTOMERS = [
    'f0389bef-7d75-4e2e-b37a-800ba6ebcdf2',
    '660e3d8f-b391-4cac-82a3-05d1d4fb7193',
    '2f99aa1d-5673-44e4-9b97-27ff4080ba52',
    '6b0540ea-5d30-4274-a345-33ef8119de79',
    '7d304b66-4a2c-41c1-9675-3ac9020c0c76',
    '0360050c-a751-4f30-a08c-fe12cc92c45e',
    '91745f42-e42c-4b47-af93-a9700bc7a697',
    '3adc12be-45a5-4410-b1e7-29d689feb2a3',
    '61353fa7-98ce-49e5-8a9f-b4f15f84504e',
    'cc94489c-00b3-48ee-90bf-0e1fc4467fe7',
    '45a4d510-adb8-41d1-a34e-557ed6b88309',
    '38e1973b-14a3-4c76-9f8f-92978bb216df',
    '9c889f03-3395-433e-8af9-6eefbf134a8a',
    'cecaf300-4b45-4773-ad2a-a2e413afbd0f',
    '56cb48ae-a9d4-47c6-9744-b99c535bdc1b',
    '497a8d84-53fd-4404-9fca-882838a71b1a',
    '349cda06-21c7-449e-b6fc-6df0972605b9',
    'ed79b15e-f60b-4cc6-877b-c653606e68a3',
    '464c13bd-e8f6-460a-9413-12d9a62424b5',
    '789d7220-b664-41f6-b530-2da6314c66e5',
    '1b30995d-e858-4a65-8636-5970e44938b4',
    'caf9b7c2-9c22-4c13-85d4-e7d960ab9a23',
    'f5241f40-2d68-43c0-a1ad-3e1cfa5de580',
    '8690845e-f2d3-49b9-8404-96eba237c522',
    '78ed022f-2fbc-4da9-970b-a1d37378778f',
    '9b3e5358-8fff-4bcd-86be-7aff5b9ea33a',
    'd63164ff-9ca5-4f9e-af04-25daf52f2793',
    '94fd8871-5d49-435d-8aa1-3eba7ee78c87',
  ];

  const DEV_BUILDINGS = [
    '009aa914-72b4-421c-8ea8-2115f0a61e04',
    'bb92473f-59fb-47e6-91d2-ca11227f6df0',
    '3ba02005-388d-466f-bb33-98b6e77cec38',
    '802c3fbc-2e24-4192-9adb-2f578a935974',
    'af60384d-f314-417f-a72c-df451d7f9d71',
    'fdc09122-f25f-4e8c-8c09-d78627063240',
    '53f9fce7-74df-44a0-83ca-5d7d45ef8b0f',
    '4b962433-c651-4c24-a57e-9a84f52d73a1',
    '9148075e-89f2-4615-91ad-e2fb5dea078e',
    '0f2c9a33-cecd-47e7-a845-3624156252d3',
    '7641c579-0867-4bd3-98c1-47745031014f',
    'bef2012e-ff47-442d-b2ed-bfe94f2db9a3',
    '3c332f92-36d8-4bca-b63a-0791dd12c626',
    '120ebf24-a8dd-48dc-85fa-daf753c3650d',
    '7fa2dfdb-4287-4fa2-8bdd-569da5d97594',
    '527bb935-cd48-47fb-8f28-967d62403a83',
    'ea84ebba-4b70-47a1-b6b2-6950244d6aa6',
    '08205f5a-b255-478d-b5b0-35dfc4d904db',
    'd08bad19-d6d0-4a02-a269-4213b34f14df',
    '6d52595c-8290-46dd-9462-113208ea789a',
    'fd95fbe2-15cc-4227-9b66-041a3ac6ff14',
    '3c29a2e8-1366-4a26-a439-6ee6f00edc4d',
    '50c64ff1-08fa-40a4-8289-d03fe730a467',
    '898c3b45-c14b-4247-9b7c-ded325b6f829',
  ];

  const QA_CUSTOMERS = [
    'c8b2cfb6-0014-4dd8-8e4b-3b12c66bf038',
    'def23b95-490e-4d1a-8ce1-3e902c356f40',
    '0157279f-7c4e-4318-9e6b-301496473033',
    '6041dec4-d5a7-46b7-b24c-c488dd6bb2fc',
    '52f56b3e-3e0b-498d-951a-42ae598f83e3',
    '6e87720c-0ceb-43af-8c13-b52eac9120dd',
    '612713c9-e507-4d31-8abb-63d43b6ef24a',
    '71dc5b2d-e51d-4581-85b1-37606215e60d',
    '360708b3-5d29-45d5-b341-a09df4ed3f42',
    '3dd2ddf4-cb07-4a1f-b727-4901e2fc991d',
  ];

  const QA_BUILDINGS = [
    '0a656905-0e53-40b5-b1ae-684fdf53126c',
    '298b5910-8316-484e-b54b-5363bf8f36c8',
    '3bae6421-5fdb-4619-99da-14b089cd412d',
    '6b398b41-c898-41e7-a399-35d6d3369bdc',
    '7d10ff4c-7cdc-45d5-aa2e-aa6943744573',
    '9dd58515-56b5-4866-a406-1447cbfc8582',
    'a3087dd3-1114-4baf-a213-58d4d3826363',
    'c34bbaba-e8d1-47a8-9430-6556fa66929a',
    'e0532900-dc9d-4008-a895-822829d8679d',
    'e790999f-5ede-4a1c-8f4c-aa01fbe03d2b',
    '41e46991-85bd-4ec0-9bb1-3a29539fe289',
    'b4d0b9a1-1c1a-449c-b0c2-ab5ac59de481',
    'f3eb2d18-b999-42e1-9de6-05d38faeea4a',
    '1cb11d3d-1736-446c-bb6c-c1f76ee085ba',
    '3a62a1c1-7718-4edd-a476-8296c2677be9',
    '3bbda2ed-9c86-469e-b3cd-16b9b9b3c757',
    '3cd3d659-2aeb-4802-9986-7343d13aba7d',
    '725ac73a-2071-42c5-9f3d-9fd73f9a1f69',
    '3fe49173-2481-48d4-9924-f64db0c0b046',
    '4297bade-f990-4b40-8081-9cec3bb6a975',
    '82a13825-a68f-47bb-b9e5-286e6958903b',
    'ec1eb87a-bd0a-4fe3-ada1-b48b30757f93',
    'fd48cbd4-90d9-4c56-b47f-b1f07c46acd5',
    '7a66add9-f7ff-4bf5-bdaf-26d84a9b169e',
    '5ebb8a64-0666-460e-9051-6d13e3c4d12c',
    '943270ca-5746-40b7-b227-aa9ea33ae549',
    'beb0c5d0-5737-4bcb-b16d-bff13106bbf5',
    '6eb9a7fe-7a7f-400b-94ca-2ad2839d3ba8',
    '7ada4c9d-391e-47bd-8a4d-f33dc1d6073d',
    'c82ec0e4-085a-4c86-805a-080c219f8ba1',
    '174b2584-e584-46ba-b2fa-d7f03e3602a7',
    '2b616455-d294-46cc-bac5-df38673cf81b',
    '77e1d020-185c-4655-b739-2e26ce6ee478',
    'c7c7b5eb-20f5-4d22-90bf-366fd1f0d47a',
  ];

  const PREPROD_CUSTOMERS = [
    '9ebce91c-2824-435f-989f-99b701ed1cd3',
    '235318cd-696e-4cb4-a515-adfaa00996f8',
    '7be4890a-e3ef-4e57-a87a-f226388d5e84',
    '268b83a8-fb6e-4bc3-a39b-cba0dc0c97e8',
    '5611aedc-5d40-4660-b0b9-04ce78913f31',
    '74a4afdb-e842-4384-ac66-4fc9690e5551',
    'db0417d8-3d04-49a1-a41f-c7a2496b03af',
    '20e14060-917f-4d42-8ec7-05d9c29e367a',
    '68b91fbc-7de1-47b9-b0aa-a472d1cec0c6',
    '4b6110de-79fa-4336-bdae-4f478f511d0d',
    'a252fdf0-c75e-493e-a8e9-b83080949a6e',
    '41662319-7c07-43a6-a9cb-a491e3679126',
    '51e42132-75d7-44b0-b4cf-26b32286c3af',
  ];

  const PREPROD_BUILDINGS = [
    '0bacebcb-c3d7-4137-9ba6-56bbd8ddfd4d',
    'd35ec5f0-d742-4d9a-91f3-2334469dc113',
    'c9451dbf-092a-4a01-bb36-ddbc90633198',
    '2836ef82-8860-4d65-aaa7-ec2d9094cf54',
    'd09a6e38-b27b-42ba-8b77-0723adc034cb',
    '30315137-ac48-4581-b4dd-a366317fba91',
    'bf32cdc5-f70f-4f87-a930-f6bd59deb5fe',
    'af5db225-d103-4b2f-ab4b-f9e418d8c21a',
    '592d212a-d125-404a-a72b-8fc544b02a5c',
    '4d85cfe2-96e0-4e64-9771-2b47c66385d1',
    '5f6f51ed-1874-44e8-b319-1f114443ae78',
    '622ca72c-e408-47da-bff0-1ec753ddee83',
    '80a9324a-654c-43f5-aec1-23ba854cff8c',
    '77dbd627-85ba-407e-9bb3-e218d1e44448',
    'b86490d2-1fd2-4f76-8601-bafa7ab7168a',
    '565b078a-e5cb-4ded-b11e-22996468651b',
    '67c47b05-6d16-41f2-b807-9a1238556da9',
    '088dcca4-a391-4703-8bf3-8a9e7b357577',
    '1b791135-8d9a-49bb-8c28-0e4163754309',
    'ec0c9e2b-823d-4b32-862a-023999292c91',
    '07832b51-9f96-4d62-b4ca-00f4dd1299c4',
    '47bf4c68-a790-4e42-8262-e6db57883b8c',
    '863c528f-aa41-4a44-8106-33b2ee53de72',
    '68ff3e16-0513-407c-a7f2-e1038000fb8b',
    'f62dfb09-4793-4243-944c-524fdc4181a1',
    '27e1f1f7-902c-4fd4-b4d1-f9f50fd1d9bc',
    '2083b672-6784-49ef-b398-b20cf4d11176',
    'e1ad3e3a-b01a-424a-ab61-cf3f2f259d4a',
    '7af7cbc2-d3b9-4027-83a1-01de4006de52',
    '8a3d2f2f-e550-477d-a07e-2f0fc6f78fb6',
    '8efb7fdf-0c4c-44d1-82d6-bc24faf8acca',
    '6994ddbc-01d0-4d43-ba6b-d0fec3cc26f2',
    '6b64b41b-fa0e-4448-9a48-9e3304105a1c',
    '46638301-ded8-4e73-a552-d356eaa94758',
    '65cd990d-b81a-4df0-91e5-da0313e15771',
    'a38be049-37df-4cc5-a051-43da959eb5a4',
    '8ca05e23-30b0-4ad6-a1db-3a884c10f027',
    '2b431eac-3904-4f84-a61b-c8ea1358af92',
    '3ed83de6-684d-45b6-b112-25801fb9ec96',
    'c4e23eb2-2159-4553-b220-a165e24f3cab',
    'e47b2931-d324-44a8-ac3b-cb23c1880313',
    '7367fc96-5770-4e0f-a80d-0cd5ffbd7080',
    '7db8cd8f-1824-4600-8f0e-792e3626e6a8',
    'fae1945c-90be-4ef3-9764-c78dd1d8201d',
    '9ff1e21a-4f4f-4654-9267-2ba5e6087089',
    'e080b2d8-f10b-4dc3-b283-bb55b17dd093',
    'd5ce3e46-9b6e-4aa5-b4ef-277cdc56f9db',
    '7c6dd186-9cbd-462c-be81-2c700d95519e',
    '0c7f8e36-092e-4be9-a564-2bc47bd2d8fe',
    '0afb7ba5-792d-4087-8c70-c29f121149ff',
    'bf18007a-9815-41ad-ad68-512835c26438',
    '284d14f8-27cd-4f24-ac3a-baff58537911',
    'cdde1e7b-f83c-4c6f-912d-2014d9d45160',
    'c6f5e12e-027f-4d9c-bbb2-b20e1ddacf4d',
    '24e91bb5-b681-4083-a3c4-261201c1cbd3',
    'ae126c0e-bff6-43cb-90a8-058e67077403',
    '24c91775-058a-499b-9296-0d5da7db7b87',
    '36061e56-0f05-4efc-85b9-85a2dc6eff7e',
    '8e5e041a-b334-47a4-8333-48c9f36eebca',
    'b789f861-103b-4ac9-a927-2a4985a7818e',
    'e1f16a48-63fb-417a-b6d0-79f0efa2a9f2',
    '8f5f2ddc-feff-47e5-842f-8096e82ecba9',
    '495e8414-d516-49e7-9ece-4c8b6d196abd',
    '2ae648f7-5aae-41e6-ade9-adf86ba9aa1f',
    'b5f16522-84c1-4424-b726-a73d987794b2',
    '4770ab04-fec8-474c-8319-ce9d10c56355',
    '8556db4b-1b73-44bb-969c-ccb4820c24e7',
    '25205720-7ade-4b22-9977-b75ec74db77b',
    '299a1c8a-54b8-42ca-a68b-b3276c8b0004',
    'ca566594-0e22-49cf-be8c-80d0998127e3',
    'c27acfb2-42ca-4004-8e66-3a51e446cac5',
    '61dd396a-ebaf-4d18-8ab5-e0d27ee88bee',
    '503522d9-e9d2-4b37-b709-24a8d3faff42',
    '90ce5770-19db-4b7f-bf3c-7b8233345c0b',
    '9f44c969-2fa5-43fa-9d15-edff07c5728e',
    'b3d51a22-cd74-4149-89fb-579d608b28f0',
    '77c16c63-4857-472d-81c9-9221d54ffe48',
    '1908b028-c71a-48d9-8575-8762cb46e344',
    '66841313-88c2-46a8-b1b9-3c1c607d6a71',
    '902596c9-5226-43bf-85b3-09313834579b',
    '3b622b6c-0d06-49f1-94fa-f400f8c92530',
    '0e6acd30-76f0-4dab-a049-08a437e6dce0',
    'a8a39990-21d8-4c1b-8c36-9edd39eeaa4f',
    '21d95bf5-a860-48d1-ba32-3fcb193f01f1',
    '6ad4d010-c994-466c-ba0b-dd8a2022a40f',
    '1737635f-31c6-423b-8827-300b1989b43f',
    '00951497-1127-49c0-a839-fd0ca524eba1',
    '2e5a82ed-ad59-4140-a8b5-e16af221609e',
    'ee630b3b-bf18-4ee6-b40b-a4bacff64d2a',
    '28d64215-9fa6-4d4c-a1db-c8ba2805c3f7',
    '93a8687e-1d78-4ff7-b54e-2727d9abec6d',
    'a6f85fbd-b9cb-4dbe-87b1-eec3a389a52e',
    'f351f6ef-0c43-4c27-8492-d90bed3cb786',
    '4eb4eaef-90c1-455d-89d5-b04ba0a2ff80',
    '65ff67c3-428e-46d3-84d0-1713f0a58f54',
    'cf28f8a6-ea0d-486b-9642-15752291b381',
    '79a9efca-0883-4480-9d22-7c52b077ea47',
    '184da364-3807-4d77-89a4-df552e02f484',
    '65a7c48e-bce6-4946-8182-3cec0c745edd',
    '1ad86f2c-a323-4231-ac3e-7a95f56d2452',
    '6f6818d2-bb4e-4b95-a8cb-d4faf117b37c',
    '82a064fe-6eb4-4aef-9713-d5dc04291de0',
    '7d2f931c-22dd-43ec-a94a-135c23d3b738',
    'f73f81e2-dd50-45f4-b19e-10154e5bb456',
    'a5139165-cea8-4473-b61d-e523d8ef05b4',
    'd115f622-7ce4-4d2f-bd90-563e3f63c4e2',
    '32e3a13d-a513-4907-8aec-1b14b9be711a',
    '27c3522b-03d6-4cbc-92c1-d84975b35c0a',
    'de6cf140-c766-40bf-add3-e11b3580e110',
    '023b6d07-f42b-4f25-94fc-872487d242de',
    '10a91fbe-3410-4c81-89b7-935d053728a2',
    'cf229ae9-a936-4637-a103-662af1a5bcb5',
    'f4834f3e-3f87-4890-8413-0277bb7cacc5',
    '773dad59-089a-4e7a-b805-9120ccf7f28d',
    'ee4f450e-f294-4ceb-beca-7484356c682c',
    '883cfb74-1044-413d-a342-a59fd6597d6a',
    'f118e605-fb22-4843-b0ba-7102d99acd48',
    '479dcde7-ef20-420f-b521-caec393be1a0',
    'a986952d-b74f-450f-a326-e1c564ba127e',
    'e612ff6f-c92d-4361-90cf-461b11672c26',
    'ea4cbbe5-f0d6-4206-9b9f-422e52387a70',
    'f42abc0f-60d0-4b44-8d3b-45130ff1b0ee',
    '37afffb0-4bd6-46b9-9166-bac78282dd28',
    'fce5f27d-3c99-465e-ac66-be65e4a7b1b4',
    '0c9e893c-b66b-4756-8380-c95681757c11',
    '5793dee0-6b54-427f-b72f-a1f614c17a53',
    'a0ed57a5-5483-4051-b8da-1d199a75cadd',
    'c7065242-c441-47ff-a3a9-52ad4a4816c7',
    '2a70a6b0-0b69-469d-a69f-0a818b7f8fa0',
    'fadcbf4e-51f8-4070-bf06-42d029abbcfc',
    'c0e3a2e3-1d82-4996-90e9-4ad1025e052e',
  ];

  const PROD_CUSTOMERS = [
    '2bf03074-32db-49c7-ab3f-277653e4f580',
    'e7c88b5c-c8a9-4b29-adf9-a3601ce4894c',
    'fc289047-d94b-42b8-9178-05aaeb07542f',
    'db0417d8-3d04-49a1-a41f-c7a2496b03af',
    'df9eab44-427c-4f91-a9b8-9877974aeffc',
    '38245022-4f2a-4abf-87fa-f8e2e38a7daa',
    '74a4afdb-e842-4384-ac66-4fc9690e5551',
    '5611aedc-5d40-4660-b0b9-04ce78913f31',
    'be8ea419-d57d-4a1f-bc96-731b0505b894',
    'a252fdf0-c75e-493e-a8e9-b83080949a6e',
    '8360c639-3ef3-493f-b0ab-2c36cfa7dcec',
    '20e14060-917f-4d42-8ec7-05d9c29e367a',
  ];

  const PROD_BUILDINGS = [
    'f72f2fe8-b830-4404-9163-dc6de48a1d6a',
    '74263dc2-c48f-4dec-a91d-2a8475d10dbd',
    'df01f019-ddf6-445f-9679-6e3bdc2a0e87',
    '132e40b4-cd27-4aa0-be07-6bc15973ec1e',
    '17b9a7dd-9b37-419d-a3b8-bb4742bb3dfa',
    '955991b1-1d9c-46b2-bcf9-33fae6b4fc45',
    'fce5f27d-3c99-465e-ac66-be65e4a7b1b4',
    '12069fb2-e786-492f-b061-95ec9be09920',
    '12ba445a-568d-474d-a696-39ebf5225dc6',
    '19f8eaea-7eb4-4e7d-b065-cb6e89419e87',
    '21814b11-6f8e-4d3e-8c45-e0f306b5642e',
    '29301d2a-40e7-437a-969f-e433a2b7bd26',
    '3a70c0b4-7f07-4a7c-a588-24af859ca9b0',
    '41fcf120-8eef-4b3a-a93e-a5afc4fa69a9',
    '5e4fe28f-aab0-462a-800b-8f4904ad7493',
    '6bba436e-0aec-4833-8e07-47e2d2305578',
    '98e0cffd-4f30-495a-b2b1-39a9f3e0c163',
    'a0ed57a5-5483-4051-b8da-1d199a75cadd',
    'a24f2af2-37d3-47e1-8592-09da65646d85',
    'c7065242-c441-47ff-a3a9-52ad4a4816c7',
    'c9a2518c-0605-4287-9072-5bbc456acca4',
    'e9588351-1156-40ae-a5ec-4450981e4b97',
    'f0c2ffbe-0ef2-4c3a-bbb2-6ff08821d6e7',
    'f4d0c434-b616-4d25-bb43-dac6bc628b8d',
    'f7882afe-4150-473f-b5e9-4bddba31880d',
    'f6f12047-4f54-44d6-9f56-fac9f5a91aba',
    '69720c56-e174-4bd0-a7c2-52f45118e859',
    'e08c5e32-1e0f-4cf9-99bc-039d44e81b29',
    '37afffb0-4bd6-46b9-9166-bac78282dd28',
    '6746fc5b-309d-4702-9470-97476b2af6e1',
    '53b7f585-6510-45d6-a705-bd1637816b96',
    '77c1ce0f-1948-45f6-b230-855a8e97af08',
    '7d9afa8b-4426-4a3a-b336-dd0ceecd1ce8',
    '2a70a6b0-0b69-469d-a69f-0a818b7f8fa0',
    'e069acc1-a577-4dd7-973a-456addaa54b3',
    '47f07e9d-ad42-4775-acb2-c15f96ee5fee',
    '176d7bc0-1c65-4cc3-baeb-1f3ed123c3db',
    '0bb02d83-716f-428c-990d-ac104ef60d3b',
    '9af99d64-4d42-4375-9468-72efa3c5df2e',
  ];

  const CONFIGS = new Map<Env, UserConfig>([
    [
      Env.DEV,
      {
        customersToAssign: DEV_CUSTOMERS,
        buildingsToAssign: DEV_BUILDINGS,
        usersToInvite: [{ email: 'test.dev.abound@carrier.com', role: UserRole.GLOBAL_ADMIN }],
      },
    ],
    [
      Env.QA,
      {
        customersToAssign: QA_CUSTOMERS,
        buildingsToAssign: QA_BUILDINGS,
        usersToInvite: [
          { email: 'test.qa.abound+globaladmin@carrier.com', role: UserRole.GLOBAL_ADMIN },
          { email: 'test.qa.abound+admin@carrier.com', role: UserRole.ADMIN },
          { email: 'test.qa.abound+member@carrier.com', role: UserRole.MEMBER },
        ],
      },
    ],
    [
      Env.PRE_PROD,
      {
        customersToAssign: PREPROD_CUSTOMERS,
        buildingsToAssign: PREPROD_BUILDINGS,
        usersToInvite: [
          { email: 'test.preprod.abound+globaladmin@carrier.com', role: UserRole.GLOBAL_ADMIN },
          { email: 'test.preprod.abound+admin@carrier.com', role: UserRole.ADMIN },
          { email: 'test.preprod.abound+member@carrier.com', role: UserRole.MEMBER },
        ],
      },
    ],
    [
      Env.PROD,
      {
        customersToAssign: PROD_CUSTOMERS,
        buildingsToAssign: PROD_BUILDINGS,
        usersToInvite: [
          { email: 'test.prod.abound+globaladmin@carrier.com', role: UserRole.GLOBAL_ADMIN },
          { email: 'test.prod.abound+admin@carrier.com', role: UserRole.ADMIN },
          { email: 'test.prod.abound+member@carrier.com', role: UserRole.MEMBER },
        ],
      },
    ],
  ]);

  function getInviteUsersInput(
    customersToAssign: string[],
    buildingsToAssign: string[],
    email: string,
    role: UserRole,
  ): InviteUserInput {
    return {
      customersToAssign,
      buildingsToAssign,
      email,
      firstName: 'Autotest',
      lastName: 'Playwright',
      role,
    };
  }

  const CONFIG = forceGetFromMap(CONFIGS, getCurrentEnv());

  test('invite users required by e2e tests', async ({ gqlRunnerByGlobalAdmin }) => {
    const users = CONFIG.usersToInvite.map((userToInvite) =>
      getInviteUsersInput(CONFIG.customersToAssign, CONFIG.buildingsToAssign, userToInvite.email, userToInvite.role),
    );
    allure.description('```' + `${inviteUsers} ===== ${JSON.stringify(users, null, 2)}`);

    await gqlRunnerByGlobalAdmin.runTestStep(
      { query: inviteUsers, variables: { users } },
      (response: APIResponse) => Promise.resolve(expect(response.status()).toBe(200)),
      { url: getAdminGqlGatewayUrl(getCurrentEnv()) },
    );
  });
});
