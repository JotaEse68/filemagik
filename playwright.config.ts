import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',
 timeout:45000,
 expect:{timeout:12000},
 retries:1,
 reporter:[['list'],['html',{open:'never',outputFolder:'playwright-report'}]],
 use:{baseURL:'http://127.0.0.1:3100',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1366,height:768}}},
  {name:'mobile-chromium',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}}
 ],
 webServer:{command:'npm run start -- -p 3100',url:'http://127.0.0.1:3100/es',timeout:120000,reuseExistingServer:!process.env.CI}
});
