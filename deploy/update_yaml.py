import os
from deploy_functions import FUNC_DIR_ENTRIES, get_func_dirs
import logging

def update_watchdog(file, old, new):
    lines = file.readlines()
    if old in lines[0]:
        lines[0] = lines[0].replace(old, new)
        return lines
    else:
        raise RuntimeError(f'update_watchdog: no match for {old}')

def update_image(file, old, new):
    lines = file.readlines()
    for i, l in enumerate(lines):
        if 'image' in l and old in l:
            lines[i] = l.replace(old, new)
            return lines
    raise RuntimeError(f'update_image: no match for {old}')

if __name__ == '__main__':
    succ_cnt, fail_cnt = 0, 0
    for de in FUNC_DIR_ENTRIES:
        for dt in get_func_dirs(de):
            dockerfile = os.path.join(dt[1], 'template', 'node10-express', 'Dockerfile')
            yamlfile = os.path.join(dt[1], f'{dt[0]}.yml')
            try:
                # Update Dockerfile
                with open(dockerfile, 'r') as f:
                    updated_lines_docker = update_watchdog(
                                    file=f,
                                    old='kaiyhou/of-watchdog-tcp:v2.0',
                                    new='kaiyhou/of-watchdog-tcp:v3.0'
                                    )
                with open(dockerfile, 'w') as f:
                    f.writelines(updated_lines_docker)
                # Update YAML file
                with open(yamlfile, 'r') as f:
                    updated_lines_yaml = update_image(file=f, old='tcp2', new='tcp3')
                with open(yamlfile, 'w') as f:
                    f.writelines(updated_lines_yaml)
                # Update count
                succ_cnt += 1
            except IOError as e:
                logging.error(f'IOError for {dt[0]}')
                logging.error(e)
                fail_cnt += 1
            except RuntimeError as e:
                logging.error(f'RuntimeError for {dt[0]}')
                logging.error(e) 
                fail_cnt += 1 
    print(f'Success: {succ_cnt} Failure: {fail_cnt}')
