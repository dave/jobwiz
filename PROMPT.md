@activity.md

**ONLY MERGE WITH {BRANCH} LISTED ABOVE. IF THIS IS NOT MAIN, THEN DO NOT MODIFY THE MAIN BRANCH.**

First read activity_{ISSUE}.md to see what was recently completed. If that file doesn't exist, create it with a link to the parent issue, a short summary and a checklist of sub-issues.

If needed, start the site locally. If port is taken, try another port.

Analyze all the GitHub issues that are listed on the {ISSUE} parent issue. When working out which issues are ready to go, look at the tags. Exclude all issues with tags like "in-progress", "failed", "needs-input" or "blocked".

Pick the issue that you determine has the highest priority and isn't blocked by other unfinished work. Only pick from issues that are ready to go, and listed on the {ISSUE} parent issue. 

If all issues inside the {ISSUE} parent issue complete (or none are ready to go), output <promise>COMPLETE</promise>.

Add the "in-progress" tag to the chosen issue.

While running the implementation or tests, watch out for infinite loops. If a series of steps repeat 5+ times, we should fail (add a "fail" tag to the issue) and exit.  

Work on exactly ONE issue: implement the change.

Run all tests and think deeply about how to fully test the acceptance criteria (found in the github issue OR in the /docs/specs folder). 

If any tests fail or any acceptance criteria is not satisfied, make changes and repeat until we have full compliance with all tests and acceptance criteria. 

If we can't get the tests / acceptance criteria to pass after several attempts and we are not making progress or you think we might be in a loop, add the "failed" tag to the issue and exit.

If human input is needed and we can't complete the task without it, add the "needs-input" tag and exit.

DO NOT CONTINUE IF ANY TESTS FAIL OR IF THE ACCEPTANCE CRITERIA ARE NOT MET

Append a dated progress entry to activity_{ISSUE}.md describing what you changed.

ONLY WORK ON A SINGLE ISSUE.

Do not git init, do not change remotes, do not push directly without making a PR. DO NOT MERGE WITH ANY BRANCH EXCEPT {BRANCH}.

When fully finished, make one git commit for that task only with a clear message. Create a pull request that completes the issue, and merge the PR. 

Remove the "in-progress" from the issue.

After you've finished work, just exit. Do not pick any more work to do. 

If the picked task did not require work, just exit.