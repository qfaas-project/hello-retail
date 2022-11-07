import logging
import os
import click
import subprocess

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

FUNC_DIR_BASE = '../functions'

FUNC_DIR_ENTRIES = [
    'photo',
    'product-catalog',
    'product-purchase'
]

# Get a list of tuples (function_name, funtion_dir_path)
def get_func_dirs(func_dir_entry):
    r = filter(lambda dt: os.path.isdir(dt[1]),
               map(lambda dn: (dn, os.path.join(func_dir_entry, dn)),
                   os.listdir(func_dir_entry)))
    return list(r)

# Only deploy the function w/o building the image
def deploy(func_name, func_dir):
    logging.info(f'Deploy Function: {func_name}')
    args = [
        'faas-cli',
        'deploy',
        '-f',
        f'{func_name}.yml'
    ]
    # logging.info(str(args))
    subprocess.run(args, cwd=func_dir)

# Build the function
def build(func_name, func_dir):
    logging.info(f'Build Function: {func_name}')
    args = [
        'faas-cli',
        'build',
        '-f',
        f'{func_name}.yml'
    ]
    # logging.info(str(args))
    subprocess.run(args, cwd=func_dir)

# Push the function
def push(func_name, func_dir):
    logging.info(f'Push Function: {func_name}')
    args = [
        'faas-cli',
        'push',
        '-f',
        f'{func_name}.yml'
    ]
    # logging.info(str(args))
    subprocess.run(args, cwd=func_dir)

# Build, push and deploy the function
def up(func_name, func_dir):
    logging.info(f'Build, Push and Deploy Function: {func_name}')
    args = [
        'faas-cli',
        'up',
        '-f',
        f'{func_name}.yml'
    ]
    # logging.info(str(args))
    subprocess.run(args, cwd=func_dir)

# Build, push and deploy the function
def delete(func_name, func_dir):
    logging.info(f'Build, Push and Deploy Function: {func_name}')
    args = [
        'faas-cli',
        'delete',
        '-f',
        f'{func_name}.yml'
    ]
    # logging.info(str(args))
    subprocess.run(args, cwd=func_dir)


@click.command()
@click.option('--protocol', 
              type=click.Choice(['tcp', 'tls', 'quic'], case_sensitive=False), 
              required=True)
@click.option('--task', 
              type=click.Choice(['build', 'push', 'deploy', 'up', 'delete'], case_sensitive=False), 
              required=True)
def main(protocol, task):
    logging.info(f'Protocol: {protocol} Task: {task}')
    true_fun_dir_entries = [os.path.join(FUNC_DIR_BASE, protocol, e) for e in FUNC_DIR_ENTRIES]
    """Build OR Push OR Deploy hello-retail serverless functions to the OpenFaaS""" 
    for de in true_fun_dir_entries:
        for dt in get_func_dirs(de):
            if(task == 'build'):
                build(dt[0], dt[1])
            elif(task == 'push'):
                push(dt[0], dt[1])
            elif(task == 'deploy'):
                deploy(dt[0], dt[1])
            elif(task == 'up'):
                up(dt[0], dt[1])
            elif(task == 'delete'):
                delete(dt[0], dt[1])
            else:
                logging.error(f'Unsupported task: {task}')
                exit()

if __name__ == '__main__':
    main()
