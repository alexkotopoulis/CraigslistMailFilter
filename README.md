# CraigslistMailFilter
Filter Craigslist Alerts in Gmail Inbox to eliminate repeated listings

Is based on configured Craigslist Alerts to a GMail mail account. The script will periodically scan unread email for mails from the sender "CL Search Alerts". If such an email is found, it will compare each listing within the alert with a list of previously seen listings. The comparison is done through the Craigslist ID of each listing. If all listings within the alert were previously seen, the email is deleted. If there are unseen listings within the alert, the listings within the alert are marked "seen" and the alert email thread is starred, which will cause it to be ignored in subsequent scans.

Steps to set up craigslist filter:
1. Create an [email alert in Craigslist] (https://www.craigslist.org/about/saved_searches_and_alerts)
2. Create a new project in [Google Apps Script](https://www.google.com/script/start/). The apps script needs to be under the same Google user as the GMail account. 
3. Copy Code.gs from this repository into the Apps Script project
4. Set the Craigslist region for the searches in Code.gs, change "sfbay.craigslist.org" on line 11 to the correct region.
5. Run the function "setFilterTrigger()" from Code.gs in Apps Script. Accept when asked for access to various Google APIs. 

Known issues: 
- Some sellers repost listing so that the CL ID changes. This is missed by this algorithm and shown as a new listing. 
- If you leave alert email threads starred, Google might add new alerts into the same thread and they will stay unscanned. Please unstar alerts once read. 
