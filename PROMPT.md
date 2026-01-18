@activity.md

We are rebuilding the project from scratch in this repo.

At all stages of operation, append the a summary of the currently executing work to CURRENT_TASK.md. Never leave this file without updates for more than 10 seconds during execution... It needs to be constantly updated.

First read activity.md to see what was recently accomplished.

If needed, start the site locally. If port is taken, try another port.

Analyze all the GitHub issues.

First work out which stage we should be working on. Don't pick issues from later stages if the earlier stage is not complete.

Pick an issue from the current stage that you determine has the highest priority and isn't blocked by other unfinished work. 

Make sure all sub-issues are completed separately before starting the parent issue. 

Ensure we have completed all tasks in one stage before moving on to the next stage. 

If all issues are complete, output <promise>COMPLETE</promise>.

Clear the contents of CURRENT_TASK.md, and update with a link to the issue you've selected.

During implementation, append to CURRENT_TASK.md with a detailed log of implementation and testing progress. If there are any long-running processes, append the CURRENT_TASK.md file regularly during the task execution informing that the task is still running. Only append new lines to this file, never modify.

While running the implementation or tests, watch out for infinite loops. If a series of steps repeat 5+ times, we should fail and try a different method.  

Work on exactly ONE issue: implement the change.

Run all tests and think deeply about how to fully test the acceptance criteria (found in the github issue or in the /docs/specs folder). 

If any tests fail or any acceptance criteria is not satisfied, make changes and repeat until we have full compliance with all tests and acceptance criteria.

DO NOT CONTINUE IF ANY TESTS FAIL OR IF THE ACCEPTANCE CRITERIA ARE NOT MET

After implementing determine if the changes created some new UI or visual changes. If they did, we should take a screenshot of the new page. If a screenshot is needed, use Playwright to:
1. Navigate to the local server URL
2. Take a screenshot and save it as screenshots/[issue-number]-[task-name].png

Append a dated progress entry to activity.md describing what you changed.

Do not git init, do not change remotes.

ONLY WORK ON A SINGLE TASK.

When fully finished, make one git commit for that task only with a clear message.

Push the changes to GitHub and mark the issue as complete.  

Never pick a second task to work on, if the picked task did not require work, just exit.